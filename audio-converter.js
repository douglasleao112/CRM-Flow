(() => {
  "use strict";

  const TARGET_SAMPLE_RATE = 48000;
  const OPUS_FRAME_SIZE = 960;
  const DEFAULT_BITRATE = 64000;

  function asciiBytes(value) {
    return new TextEncoder().encode(value);
  }

  function containsAscii(bytes, value) {
    const marker = asciiBytes(value);
    outer: for (let index = 0; index <= bytes.length - marker.length; index++) {
      for (let offset = 0; offset < marker.length; offset++) {
        if (bytes[index + offset] !== marker[offset]) continue outer;
      }
      return index;
    }
    return -1;
  }

  async function inspectFile(file) {
    const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const hasOggContainer = containsAscii(header, "OggS") === 0;
    const opusHeadOffset = containsAscii(header, "OpusHead");
    return {
      hasOggContainer,
      hasOpusCodec: opusHeadOffset >= 0,
      isOggOpus: hasOggContainer && opusHeadOffset >= 0
    };
  }

  function downmixAndResample(audioBuffer, targetRate = TARGET_SAMPLE_RATE) {
    const sourceRate = audioBuffer.sampleRate;
    const sourceLength = audioBuffer.length;
    const channelCount = Math.max(1, audioBuffer.numberOfChannels);
    const channels = Array.from(
      { length: channelCount },
      (_, index) => audioBuffer.getChannelData(index)
    );
    const outputLength = Math.max(1, Math.round(sourceLength * targetRate / sourceRate));
    const output = new Float32Array(outputLength);

    for (let index = 0; index < outputLength; index++) {
      const sourcePosition = index * sourceRate / targetRate;
      const firstIndex = Math.min(sourceLength - 1, Math.floor(sourcePosition));
      const secondIndex = Math.min(sourceLength - 1, firstIndex + 1);
      const fraction = sourcePosition - firstIndex;
      let mixed = 0;

      for (const channel of channels) {
        mixed += channel[firstIndex] + (channel[secondIndex] - channel[firstIndex]) * fraction;
      }
      output[index] = Math.max(-1, Math.min(1, mixed / channelCount));
    }

    return output;
  }

  function parsePreSkip(description) {
    if (!description) return 312;
    const bytes = description instanceof ArrayBuffer
      ? new Uint8Array(description)
      : ArrayBuffer.isView(description)
        ? new Uint8Array(description.buffer, description.byteOffset, description.byteLength)
        : null;
    if (!bytes) return 312;
    const offset = containsAscii(bytes, "OpusHead");
    if (offset < 0 || offset + 12 > bytes.length) return 312;
    return bytes[offset + 10] | (bytes[offset + 11] << 8);
  }

  function writeAscii(target, offset, value) {
    target.set(asciiBytes(value), offset);
  }

  function opusHeadPacket(preSkip) {
    const packet = new Uint8Array(19);
    const view = new DataView(packet.buffer);
    writeAscii(packet, 0, "OpusHead");
    packet[8] = 1;
    packet[9] = 1;
    view.setUint16(10, preSkip, true);
    view.setUint32(12, TARGET_SAMPLE_RATE, true);
    view.setInt16(16, 0, true);
    packet[18] = 0;
    return packet;
  }

  function opusTagsPacket() {
    const vendor = asciiBytes("Mkt Flow");
    const packet = new Uint8Array(8 + 4 + vendor.length + 4);
    const view = new DataView(packet.buffer);
    writeAscii(packet, 0, "OpusTags");
    view.setUint32(8, vendor.length, true);
    packet.set(vendor, 12);
    view.setUint32(12 + vendor.length, 0, true);
    return packet;
  }

  const oggCrcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
      let value = index << 24;
      for (let bit = 0; bit < 8; bit++) {
        value = value & 0x80000000
          ? ((value << 1) ^ 0x04c11db7) >>> 0
          : (value << 1) >>> 0;
      }
      table[index] = value;
    }
    return table;
  })();

  function oggChecksum(bytes) {
    let checksum = 0;
    for (const byte of bytes) {
      checksum = ((checksum << 8) ^ oggCrcTable[((checksum >>> 24) ^ byte) & 0xff]) >>> 0;
    }
    return checksum;
  }

  function oggPage(packet, {
    serial,
    sequence,
    granulePosition = 0,
    beginning = false,
    end = false
  }) {
    const segmentCount = Math.floor(packet.length / 255) + 1;
    if (segmentCount > 255) throw new Error("Pacote Opus grande demais para o contêiner OGG.");
    const page = new Uint8Array(27 + segmentCount + packet.length);
    const view = new DataView(page.buffer);
    writeAscii(page, 0, "OggS");
    page[4] = 0;
    page[5] = (beginning ? 2 : 0) | (end ? 4 : 0);
    const granule = BigInt(Math.max(0, Math.floor(granulePosition)));
    view.setUint32(6, Number(granule & 0xffffffffn), true);
    view.setUint32(10, Number((granule >> 32n) & 0xffffffffn), true);
    view.setUint32(14, serial >>> 0, true);
    view.setUint32(18, sequence >>> 0, true);
    view.setUint32(22, 0, true);
    page[26] = segmentCount;

    let remaining = packet.length;
    for (let index = 0; index < segmentCount; index++) {
      const size = Math.min(255, remaining);
      page[27 + index] = size;
      remaining -= size;
    }
    page.set(packet, 27 + segmentCount);
    view.setUint32(22, oggChecksum(page), true);
    return page;
  }

  function concatenate(chunks) {
    const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  async function encodeOpus(pcm, onProgress) {
    if (typeof AudioEncoder !== "function" || typeof AudioData !== "function") {
      throw new Error("Este Chrome não possui o conversor Opus necessário. Atualize o navegador.");
    }

    const config = {
      codec: "opus",
      sampleRate: TARGET_SAMPLE_RATE,
      numberOfChannels: 1,
      bitrate: DEFAULT_BITRATE
    };
    const support = await AudioEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error("Este Chrome não permite converter áudio para o codec Opus.");
    }

    const packets = [];
    let encoderError = null;
    let preSkip = 312;
    const encoder = new AudioEncoder({
      output(chunk, metadata) {
        const packet = new Uint8Array(chunk.byteLength);
        chunk.copyTo(packet);
        packets.push(packet);
        preSkip = parsePreSkip(metadata?.decoderConfig?.description) || preSkip;
      },
      error(error) {
        encoderError = error;
      }
    });
    encoder.configure(support.config || config);

    const frameCount = Math.ceil(pcm.length / OPUS_FRAME_SIZE);
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const sourceOffset = frameIndex * OPUS_FRAME_SIZE;
      const frame = new Float32Array(OPUS_FRAME_SIZE);
      frame.set(pcm.subarray(sourceOffset, sourceOffset + OPUS_FRAME_SIZE));
      const audioData = new AudioData({
        format: "f32",
        sampleRate: TARGET_SAMPLE_RATE,
        numberOfFrames: OPUS_FRAME_SIZE,
        numberOfChannels: 1,
        timestamp: Math.round(sourceOffset * 1000000 / TARGET_SAMPLE_RATE),
        data: frame
      });
      encoder.encode(audioData);
      audioData.close();
      if (frameIndex % 25 === 0) {
        onProgress?.(35 + Math.round(45 * (frameIndex + 1) / frameCount));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    await encoder.flush();
    encoder.close();
    if (encoderError) throw encoderError;
    if (!packets.length) throw new Error("O conversor não gerou dados de áudio.");
    return { packets, preSkip };
  }

  function muxOggOpus(packets, preSkip, sampleCount) {
    const serial = crypto.getRandomValues(new Uint32Array(1))[0];
    const pages = [
      oggPage(opusHeadPacket(preSkip), { serial, sequence: 0, beginning: true }),
      oggPage(opusTagsPacket(), { serial, sequence: 1 })
    ];

    packets.forEach((packet, index) => {
      const decodedSamples = Math.min(sampleCount, (index + 1) * OPUS_FRAME_SIZE);
      pages.push(oggPage(packet, {
        serial,
        sequence: index + 2,
        granulePosition: preSkip + decodedSamples,
        end: index === packets.length - 1
      }));
    });
    return concatenate(pages);
  }

  function convertedFileName(fileName) {
    const base = String(fileName || "audio")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-") || "audio";
    return `${base}-opus.ogg`;
  }

  async function convertToVoiceNote(file, onProgress) {
    onProgress?.(5);
    const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!OfflineAudioContextClass && !AudioContextClass) {
      throw new Error("O navegador não possui decodificador de áudio.");
    }
    const context = OfflineAudioContextClass
      ? new OfflineAudioContextClass(1, 1, TARGET_SAMPLE_RATE)
      : new AudioContextClass();
    let decoded;
    try {
      const source = await file.arrayBuffer();
      onProgress?.(15);
      decoded = await context.decodeAudioData(source.slice(0));
    } catch (error) {
      throw new Error("Não foi possível ler este áudio. Use MP3, WAV, M4A, AAC, FLAC, WebM ou OGG.");
    } finally {
      if (typeof context.close === "function") await context.close().catch(() => {});
    }

    onProgress?.(25);
    const pcm = downmixAndResample(decoded);
    const { packets, preSkip } = await encodeOpus(pcm, onProgress);
    onProgress?.(90);
    const oggBytes = muxOggOpus(packets, preSkip, pcm.length);
    const blob = new Blob([oggBytes], { type: "audio/ogg" });
    const result = new File([blob], convertedFileName(file.name), {
      type: "audio/ogg",
      lastModified: Date.now()
    });
    const inspection = await inspectFile(result);
    if (!inspection.isOggOpus) throw new Error("A conversão não gerou um arquivo OGG/Opus válido.");
    onProgress?.(100);
    return result;
  }

  window.WFAudioConverter = Object.freeze({ inspectFile, convertToVoiceNote });
})();
