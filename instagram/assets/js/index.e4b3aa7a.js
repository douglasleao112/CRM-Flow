import {
  r as x,
  R as ce,
  j as f,
  a as cs,
  b as I,
  d as us,
  F as Ce,
  e as Vt,
  c as ds,
} from "./jsx-runtime.4e0bb327.js";
import { a as wn } from "./axios.70832f77.js";
const ps = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
let rr = (e = 21) => {
    let t = "",
      r = crypto.getRandomValues(new Uint8Array(e));
    for (; e--;) t += ps[r[e] & 63];
    return t;
  },
  fs = { data: "" },
  gs = (e) =>
    typeof window == "object"
      ? (
          (e ? e.querySelector("#_goober") : window._goober) ||
          Object.assign(
            (e || document.head).appendChild(document.createElement("style")),
            { innerHTML: " ", id: "_goober" },
          )
        ).firstChild
      : e || fs,
  ms = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,
  vs = /\/\*[^]*?\*\/|  +/g,
  ai = /\n+/g,
  Ue = (e, t) => {
    let r = "",
      n = "",
      i = "";
    for (let o in e) {
      let a = e[o];
      o[0] == "@"
        ? o[1] == "i"
          ? (r = o + " " + a + ";")
          : (n +=
              o[1] == "f"
                ? Ue(a, o)
                : o + "{" + Ue(a, o[1] == "k" ? "" : t) + "}")
        : typeof a == "object"
          ? (n += Ue(
              a,
              t
                ? t.replace(/([^,])+/g, (s) =>
                    o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g, (u) =>
                      /&/.test(u) ? u.replace(/&/g, s) : s ? s + " " + u : u,
                    ),
                  )
                : o,
            ))
          : a != null &&
            ((o = /^--/.test(o) ? o : o.replace(/[A-Z]/g, "-$&").toLowerCase()),
            (i += Ue.p ? Ue.p(o, a) : o + ":" + a + ";"));
    }
    return r + (t && i ? t + "{" + i + "}" : i) + n;
  },
  Re = {},
  po = (e) => {
    if (typeof e == "object") {
      let t = "";
      for (let r in e) t += r + po(e[r]);
      return t;
    }
    return e;
  },
  hs = (e, t, r, n, i) => {
    let o = po(e),
      a =
        Re[o] ||
        (Re[o] = ((u) => {
          let d = 0,
            c = 11;
          for (; d < u.length;) c = (101 * c + u.charCodeAt(d++)) >>> 0;
          return "go" + c;
        })(o));
    if (!Re[a]) {
      let u =
        o !== e
          ? e
          : ((d) => {
              let c,
                p,
                l = [{}];
              for (; (c = ms.exec(d.replace(vs, "")));)
                c[4]
                  ? l.shift()
                  : c[3]
                    ? ((p = c[3].replace(ai, " ").trim()),
                      l.unshift((l[0][p] = l[0][p] || {})))
                    : (l[0][c[1]] = c[2].replace(ai, " ").trim());
              return l[0];
            })(e);
      Re[a] = Ue(i ? { ["@keyframes " + a]: u } : u, r ? "" : "." + a);
    }
    let s = r && Re.g ? Re.g : null;
    return (
      r && (Re.g = Re[a]),
      ((u, d, c, p) => {
        p
          ? (d.data = d.data.replace(p, u))
          : d.data.indexOf(u) === -1 && (d.data = c ? u + d.data : d.data + u);
      })(Re[a], t, n, s),
      a
    );
  },
  bs = (e, t, r) =>
    e.reduce((n, i, o) => {
      let a = t[o];
      if (a && a.call) {
        let s = a(r),
          u = (s && s.props && s.props.className) || (/^go/.test(s) && s);
        a = u
          ? "." + u
          : s && typeof s == "object"
            ? s.props
              ? ""
              : Ue(s, "")
            : s === !1
              ? ""
              : s;
      }
      return n + i + (a == null ? "" : a);
    }, "");
function vr(e) {
  let t = this || {},
    r = e.call ? e(t.p) : e;
  return hs(
    r.unshift
      ? r.raw
        ? bs(r, [].slice.call(arguments, 1), t.p)
        : r.reduce((n, i) => Object.assign(n, i && i.call ? i(t.p) : i), {})
      : r,
    gs(t.target),
    t.g,
    t.o,
    t.k,
  );
}
let fo, sn, ln;
vr.bind({ g: 1 });
let Te = vr.bind({ k: 1 });
function ys(e, t, r, n) {
  ((Ue.p = t), (fo = e), (sn = r), (ln = n));
}
function We(e, t) {
  let r = this || {};
  return function () {
    let n = arguments;
    function i(o, a) {
      let s = Object.assign({}, o),
        u = s.className || i.className;
      ((r.p = Object.assign({ theme: sn && sn() }, s)),
        (r.o = / *go\d+/.test(u)),
        (s.className = vr.apply(r, n) + (u ? " " + u : "")),
        t && (s.ref = a));
      let d = e;
      return (
        e[0] && ((d = s.as || e), delete s.as),
        ln && d[0] && ln(s),
        fo(d, s)
      );
    }
    return t ? t(i) : i;
  };
}
var ws = (e) => typeof e == "function",
  nr = (e, t) => (ws(e) ? e(t) : e),
  xs = (() => {
    let e = 0;
    return () => (++e).toString();
  })(),
  go = (() => {
    let e;
    return () => {
      if (e === void 0 && typeof window < "u") {
        let t = matchMedia("(prefers-reduced-motion: reduce)");
        e = !t || t.matches;
      }
      return e;
    };
  })(),
  Is = 20,
  Xt = new Map(),
  Ss = 1e3,
  si = (e) => {
    if (Xt.has(e)) return;
    let t = setTimeout(() => {
      (Xt.delete(e), Ze({ type: 4, toastId: e }));
    }, Ss);
    Xt.set(e, t);
  },
  Cs = (e) => {
    let t = Xt.get(e);
    t && clearTimeout(t);
  },
  cn = (e, t) => {
    switch (t.type) {
      case 0:
        return { ...e, toasts: [t.toast, ...e.toasts].slice(0, Is) };
      case 1:
        return (
          t.toast.id && Cs(t.toast.id),
          {
            ...e,
            toasts: e.toasts.map((o) =>
              o.id === t.toast.id ? { ...o, ...t.toast } : o,
            ),
          }
        );
      case 2:
        let { toast: r } = t;
        return e.toasts.find((o) => o.id === r.id)
          ? cn(e, { type: 1, toast: r })
          : cn(e, { type: 0, toast: r });
      case 3:
        let { toastId: n } = t;
        return (
          n
            ? si(n)
            : e.toasts.forEach((o) => {
                si(o.id);
              }),
          {
            ...e,
            toasts: e.toasts.map((o) =>
              o.id === n || n === void 0 ? { ...o, visible: !1 } : o,
            ),
          }
        );
      case 4:
        return t.toastId === void 0
          ? { ...e, toasts: [] }
          : { ...e, toasts: e.toasts.filter((o) => o.id !== t.toastId) };
      case 5:
        return { ...e, pausedAt: t.time };
      case 6:
        let i = t.time - (e.pausedAt || 0);
        return {
          ...e,
          pausedAt: void 0,
          toasts: e.toasts.map((o) => ({
            ...o,
            pauseDuration: o.pauseDuration + i,
          })),
        };
    }
  },
  Zt = [],
  er = { toasts: [], pausedAt: void 0 },
  Ze = (e) => {
    ((er = cn(er, e)),
      Zt.forEach((t) => {
        t(er);
      }));
  },
  Es = { blank: 4e3, error: 4e3, success: 2e3, loading: 1 / 0, custom: 4e3 },
  Ds = (e = {}) => {
    let [t, r] = x.exports.useState(er);
    x.exports.useEffect(
      () => (
        Zt.push(r),
        () => {
          let i = Zt.indexOf(r);
          i > -1 && Zt.splice(i, 1);
        }
      ),
      [t],
    );
    let n = t.toasts.map((i) => {
      var o, a;
      return {
        ...e,
        ...e[i.type],
        ...i,
        duration:
          i.duration ||
          ((o = e[i.type]) == null ? void 0 : o.duration) ||
          (e == null ? void 0 : e.duration) ||
          Es[i.type],
        style: {
          ...e.style,
          ...((a = e[i.type]) == null ? void 0 : a.style),
          ...i.style,
        },
      };
    });
    return { ...t, toasts: n };
  },
  _s = (e, t = "blank", r) => ({
    createdAt: Date.now(),
    visible: !0,
    type: t,
    ariaProps: { role: "status", "aria-live": "polite" },
    message: e,
    pauseDuration: 0,
    ...r,
    id: (r == null ? void 0 : r.id) || xs(),
  }),
  kt = (e) => (t, r) => {
    let n = _s(t, e, r);
    return (Ze({ type: 2, toast: n }), n.id);
  },
  be = (e, t) => kt("blank")(e, t);
be.error = kt("error");
be.success = kt("success");
be.loading = kt("loading");
be.custom = kt("custom");
be.dismiss = (e) => {
  Ze({ type: 3, toastId: e });
};
be.remove = (e) => Ze({ type: 4, toastId: e });
be.promise = (e, t, r) => {
  let n = be.loading(t.loading, { ...r, ...(r == null ? void 0 : r.loading) });
  return (
    e
      .then(
        (i) => (
          be.success(nr(t.success, i), {
            id: n,
            ...r,
            ...(r == null ? void 0 : r.success),
          }),
          i
        ),
      )
      .catch((i) => {
        be.error(nr(t.error, i), {
          id: n,
          ...r,
          ...(r == null ? void 0 : r.error),
        });
      }),
    e
  );
};
var Ns = (e, t) => {
    Ze({ type: 1, toast: { id: e, height: t } });
  },
  Ps = () => {
    Ze({ type: 5, time: Date.now() });
  },
  ks = (e) => {
    let { toasts: t, pausedAt: r } = Ds(e);
    x.exports.useEffect(() => {
      if (r) return;
      let o = Date.now(),
        a = t.map((s) => {
          if (s.duration === 1 / 0) return;
          let u = (s.duration || 0) + s.pauseDuration - (o - s.createdAt);
          if (u < 0) {
            s.visible && be.dismiss(s.id);
            return;
          }
          return setTimeout(() => be.dismiss(s.id), u);
        });
      return () => {
        a.forEach((s) => s && clearTimeout(s));
      };
    }, [t, r]);
    let n = x.exports.useCallback(() => {
        r && Ze({ type: 6, time: Date.now() });
      }, [r]),
      i = x.exports.useCallback(
        (o, a) => {
          let {
              reverseOrder: s = !1,
              gutter: u = 8,
              defaultPosition: d,
            } = a || {},
            c = t.filter(
              (g) => (g.position || d) === (o.position || d) && g.height,
            ),
            p = c.findIndex((g) => g.id === o.id),
            l = c.filter((g, h) => h < p && g.visible).length;
          return c
            .filter((g) => g.visible)
            .slice(...(s ? [l + 1] : [0, l]))
            .reduce((g, h) => g + (h.height || 0) + u, 0);
        },
        [t],
      );
    return {
      toasts: t,
      handlers: {
        updateHeight: Ns,
        startPause: Ps,
        endPause: n,
        calculateOffset: i,
      },
    };
  },
  Ms = Te`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,
  As = Te`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,
  Os = Te`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,
  Rs = We("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ms} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${As} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${(e) => e.secondary || "#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Os} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,
  Ts = Te`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,
  Bs = We("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${(e) => e.secondary || "#e0e0e0"};
  border-right-color: ${(e) => e.primary || "#616161"};
  animation: ${Ts} 1s linear infinite;
`,
  Ls = Te`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,
  Fs = Te`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,
  Us = We("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${(e) => e.primary || "#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Ls} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Fs} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${(e) => e.secondary || "#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,
  qs = We("div")`
  position: absolute;
`,
  $s = We("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,
  Gs = Te`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,
  js = We("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Gs} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,
  Ws = ({ toast: e }) => {
    let { icon: t, type: r, iconTheme: n } = e;
    return t !== void 0
      ? typeof t == "string"
        ? x.exports.createElement(js, null, t)
        : t
      : r === "blank"
        ? null
        : x.exports.createElement(
            $s,
            null,
            x.exports.createElement(Bs, { ...n }),
            r !== "loading" &&
              x.exports.createElement(
                qs,
                null,
                r === "error"
                  ? x.exports.createElement(Rs, { ...n })
                  : x.exports.createElement(Us, { ...n }),
              ),
          );
  },
  Vs = (e) => `
0% {transform: translate3d(0,${e * -200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,
  Hs = (e) => `
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e * -150}%,-1px) scale(.6); opacity:0;}
`,
  zs = "0%{opacity:0;} 100%{opacity:1;}",
  Ks = "0%{opacity:1;} 100%{opacity:0;}",
  Js = We("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,
  Ys = We("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,
  Qs = (e, t) => {
    let r = e.includes("top") ? 1 : -1,
      [n, i] = go() ? [zs, Ks] : [Vs(r), Hs(r)];
    return {
      animation: t
        ? `${Te(n)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`
        : `${Te(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`,
    };
  },
  Xs = x.exports.memo(({ toast: e, position: t, style: r, children: n }) => {
    let i = e.height
        ? Qs(e.position || t || "top-center", e.visible)
        : { opacity: 0 },
      o = x.exports.createElement(Ws, { toast: e }),
      a = x.exports.createElement(Ys, { ...e.ariaProps }, nr(e.message, e));
    return x.exports.createElement(
      Js,
      { className: e.className, style: { ...i, ...r, ...e.style } },
      typeof n == "function"
        ? n({ icon: o, message: a })
        : x.exports.createElement(x.exports.Fragment, null, o, a),
    );
  });
ys(x.exports.createElement);
var Zs = ({
    id: e,
    className: t,
    style: r,
    onHeightUpdate: n,
    children: i,
  }) => {
    let o = x.exports.useCallback(
      (a) => {
        if (a) {
          let s = () => {
            let u = a.getBoundingClientRect().height;
            n(e, u);
          };
          (s(),
            new MutationObserver(s).observe(a, {
              subtree: !0,
              childList: !0,
              characterData: !0,
            }));
        }
      },
      [e, n],
    );
    return x.exports.createElement(
      "div",
      { ref: o, className: t, style: r },
      i,
    );
  },
  el = (e, t) => {
    let r = e.includes("top"),
      n = r ? { top: 0 } : { bottom: 0 },
      i = e.includes("center")
        ? { justifyContent: "center" }
        : e.includes("right")
          ? { justifyContent: "flex-end" }
          : {};
    return {
      left: 0,
      right: 0,
      display: "flex",
      position: "absolute",
      transition: go() ? void 0 : "all 230ms cubic-bezier(.21,1.02,.73,1)",
      transform: `translateY(${t * (r ? 1 : -1)}px)`,
      ...n,
      ...i,
    };
  },
  tl = vr`
  z-index: 2147483647;
  > * {
    pointer-events: auto;
  }
`,
  Ht = 16,
  rl = ({
    reverseOrder: e,
    position: t = "top-center",
    toastOptions: r,
    gutter: n,
    children: i,
    containerStyle: o,
    containerClassName: a,
  }) => {
    let { toasts: s, handlers: u } = ks(r);
    return x.exports.createElement(
      "div",
      {
        style: {
          position: "fixed",
          zIndex: 2147483647,
          top: Ht,
          left: Ht,
          right: Ht,
          bottom: Ht,
          pointerEvents: "none",
          ...o,
        },
        className: a,
        onMouseEnter: u.startPause,
        onMouseLeave: u.endPause,
      },
      s.map((d) => {
        let c = d.position || t,
          p = u.calculateOffset(d, {
            reverseOrder: e,
            gutter: n,
            defaultPosition: t,
          }),
          l = el(c, p);
        return x.exports.createElement(
          Zs,
          {
            id: d.id,
            key: d.id,
            onHeightUpdate: u.updateHeight,
            className: d.visible ? tl : "",
            style: l,
          },
          d.type === "custom"
            ? nr(d.message, d)
            : i
              ? i(d)
              : x.exports.createElement(Xs, { toast: d, position: c }),
        );
      }),
    );
  },
  Y = be;
window.__flowsiToast = Y;
window.dispatchEvent(new CustomEvent("flowsi-toast-ready"));
function un(e, t) {
  return (
    (un = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (r, n) {
          return ((r.__proto__ = n), r);
        }),
    un(e, t)
  );
}
function mo(e, t) {
  ((e.prototype = Object.create(t.prototype)),
    (e.prototype.constructor = e),
    un(e, t));
}
function Q() {
  return (
    (Q = Object.assign
      ? Object.assign.bind()
      : function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var r = arguments[t];
            for (var n in r) ({}).hasOwnProperty.call(r, n) && (e[n] = r[n]);
          }
          return e;
        }),
    Q.apply(null, arguments)
  );
}
function It(e) {
  return (
    (It =
      typeof Symbol == "function" && typeof Symbol.iterator == "symbol"
        ? function (t) {
            return typeof t;
          }
        : function (t) {
            return t &&
              typeof Symbol == "function" &&
              t.constructor === Symbol &&
              t !== Symbol.prototype
              ? "symbol"
              : typeof t;
          }),
    It(e)
  );
}
function nl(e, t) {
  if (It(e) != "object" || !e) return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (It(n) != "object") return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function il(e) {
  var t = nl(e, "string");
  return It(t) == "symbol" ? t : t + "";
}
function ol(e, t, r) {
  return (
    (t = il(t)) in e
      ? Object.defineProperty(e, t, {
          value: r,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (e[t] = r),
    e
  );
}
function li(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    (t &&
      (n = n.filter(function (i) {
        return Object.getOwnPropertyDescriptor(e, i).enumerable;
      })),
      r.push.apply(r, n));
  }
  return r;
}
function ci(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2
      ? li(Object(r), !0).forEach(function (n) {
          ol(e, n, r[n]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r))
        : li(Object(r)).forEach(function (n) {
            Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
          });
  }
  return e;
}
function he(e) {
  return (
    "Minified Redux error #" +
    e +
    "; visit https://redux.js.org/Errors?code=" +
    e +
    " for the full message or use the non-minified dev environment for full errors. "
  );
}
var ui = (function () {
    return (typeof Symbol == "function" && Symbol.observable) || "@@observable";
  })(),
  qr = function () {
    return Math.random().toString(36).substring(7).split("").join(".");
  },
  di = {
    INIT: "@@redux/INIT" + qr(),
    REPLACE: "@@redux/REPLACE" + qr(),
    PROBE_UNKNOWN_ACTION: function () {
      return "@@redux/PROBE_UNKNOWN_ACTION" + qr();
    },
  };
function al(e) {
  if (typeof e != "object" || e === null) return !1;
  for (var t = e; Object.getPrototypeOf(t) !== null;)
    t = Object.getPrototypeOf(t);
  return Object.getPrototypeOf(e) === t;
}
function vo(e, t, r) {
  var n;
  if (
    (typeof t == "function" && typeof r == "function") ||
    (typeof r == "function" && typeof arguments[3] == "function")
  )
    throw new Error(he(0));
  if (
    (typeof t == "function" && typeof r > "u" && ((r = t), (t = void 0)),
    typeof r < "u")
  ) {
    if (typeof r != "function") throw new Error(he(1));
    return r(vo)(e, t);
  }
  if (typeof e != "function") throw new Error(he(2));
  var i = e,
    o = t,
    a = [],
    s = a,
    u = !1;
  function d() {
    s === a && (s = a.slice());
  }
  function c() {
    if (u) throw new Error(he(3));
    return o;
  }
  function p(y) {
    if (typeof y != "function") throw new Error(he(4));
    if (u) throw new Error(he(5));
    var D = !0;
    return (
      d(),
      s.push(y),
      function () {
        if (!!D) {
          if (u) throw new Error(he(6));
          ((D = !1), d());
          var w = s.indexOf(y);
          (s.splice(w, 1), (a = null));
        }
      }
    );
  }
  function l(y) {
    if (!al(y)) throw new Error(he(7));
    if (typeof y.type > "u") throw new Error(he(8));
    if (u) throw new Error(he(9));
    try {
      ((u = !0), (o = i(o, y)));
    } finally {
      u = !1;
    }
    for (var D = (a = s), C = 0; C < D.length; C++) {
      var w = D[C];
      w();
    }
    return y;
  }
  function g(y) {
    if (typeof y != "function") throw new Error(he(10));
    ((i = y), l({ type: di.REPLACE }));
  }
  function h() {
    var y,
      D = p;
    return (
      (y = {
        subscribe: function (w) {
          if (typeof w != "object" || w === null) throw new Error(he(11));
          function P() {
            w.next && w.next(c());
          }
          P();
          var _ = D(P);
          return { unsubscribe: _ };
        },
      }),
      (y[ui] = function () {
        return this;
      }),
      y
    );
  }
  return (
    l({ type: di.INIT }),
    (n = { dispatch: l, subscribe: p, getState: c, replaceReducer: g }),
    (n[ui] = h),
    n
  );
}
function pi(e, t) {
  return function () {
    return t(e.apply(this, arguments));
  };
}
function fi(e, t) {
  if (typeof e == "function") return pi(e, t);
  if (typeof e != "object" || e === null) throw new Error(he(16));
  var r = {};
  for (var n in e) {
    var i = e[n];
    typeof i == "function" && (r[n] = pi(i, t));
  }
  return r;
}
function ho() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
    t[r] = arguments[r];
  return t.length === 0
    ? function (n) {
        return n;
      }
    : t.length === 1
      ? t[0]
      : t.reduce(function (n, i) {
          return function () {
            return n(i.apply(void 0, arguments));
          };
        });
}
function sl() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
    t[r] = arguments[r];
  return function (n) {
    return function () {
      var i = n.apply(void 0, arguments),
        o = function () {
          throw new Error(he(15));
        },
        a = {
          getState: i.getState,
          dispatch: function () {
            return o.apply(void 0, arguments);
          },
        },
        s = t.map(function (u) {
          return u(a);
        });
      return (
        (o = ho.apply(void 0, s)(i.dispatch)),
        ci(ci({}, i), {}, { dispatch: o })
      );
    };
  };
}
var bo = ce.createContext(null);
function ll(e) {
  e();
}
var yo = ll,
  cl = function (t) {
    return (yo = t);
  },
  ul = function () {
    return yo;
  };
function dl() {
  var e = ul(),
    t = null,
    r = null;
  return {
    clear: function () {
      ((t = null), (r = null));
    },
    notify: function () {
      e(function () {
        for (var i = t; i;) (i.callback(), (i = i.next));
      });
    },
    get: function () {
      for (var i = [], o = t; o;) (i.push(o), (o = o.next));
      return i;
    },
    subscribe: function (i) {
      var o = !0,
        a = (r = { callback: i, next: null, prev: r });
      return (
        a.prev ? (a.prev.next = a) : (t = a),
        function () {
          !o ||
            t === null ||
            ((o = !1),
            a.next ? (a.next.prev = a.prev) : (r = a.prev),
            a.prev ? (a.prev.next = a.next) : (t = a.next));
        }
      );
    },
  };
}
var gi = {
  notify: function () {},
  get: function () {
    return [];
  },
};
function wo(e, t) {
  var r,
    n = gi;
  function i(p) {
    return (u(), n.subscribe(p));
  }
  function o() {
    n.notify();
  }
  function a() {
    c.onStateChange && c.onStateChange();
  }
  function s() {
    return Boolean(r);
  }
  function u() {
    r || ((r = t ? t.addNestedSub(a) : e.subscribe(a)), (n = dl()));
  }
  function d() {
    r && (r(), (r = void 0), n.clear(), (n = gi));
  }
  var c = {
    addNestedSub: i,
    notifyNestedSubs: o,
    handleChangeWrapper: a,
    isSubscribed: s,
    trySubscribe: u,
    tryUnsubscribe: d,
    getListeners: function () {
      return n;
    },
  };
  return c;
}
var xo =
  typeof window < "u" &&
  typeof window.document < "u" &&
  typeof window.document.createElement < "u"
    ? x.exports.useLayoutEffect
    : x.exports.useEffect;
function pl(e) {
  var t = e.store,
    r = e.context,
    n = e.children,
    i = x.exports.useMemo(
      function () {
        var s = wo(t);
        return { store: t, subscription: s };
      },
      [t],
    ),
    o = x.exports.useMemo(
      function () {
        return t.getState();
      },
      [t],
    );
  xo(
    function () {
      var s = i.subscription;
      return (
        (s.onStateChange = s.notifyNestedSubs),
        s.trySubscribe(),
        o !== t.getState() && s.notifyNestedSubs(),
        function () {
          (s.tryUnsubscribe(), (s.onStateChange = null));
        }
      );
    },
    [i, o],
  );
  var a = r || bo;
  return f(a.Provider, { value: i, children: n });
}
function ir(e, t) {
  if (e == null) return {};
  var r = {};
  for (var n in e)
    if ({}.hasOwnProperty.call(e, n)) {
      if (t.includes(n)) continue;
      r[n] = e[n];
    }
  return r;
}
var Io = { exports: {} },
  oe = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var pe = typeof Symbol == "function" && Symbol.for,
  xn = pe ? Symbol.for("react.element") : 60103,
  In = pe ? Symbol.for("react.portal") : 60106,
  hr = pe ? Symbol.for("react.fragment") : 60107,
  br = pe ? Symbol.for("react.strict_mode") : 60108,
  yr = pe ? Symbol.for("react.profiler") : 60114,
  wr = pe ? Symbol.for("react.provider") : 60109,
  xr = pe ? Symbol.for("react.context") : 60110,
  Sn = pe ? Symbol.for("react.async_mode") : 60111,
  Ir = pe ? Symbol.for("react.concurrent_mode") : 60111,
  Sr = pe ? Symbol.for("react.forward_ref") : 60112,
  Cr = pe ? Symbol.for("react.suspense") : 60113,
  fl = pe ? Symbol.for("react.suspense_list") : 60120,
  Er = pe ? Symbol.for("react.memo") : 60115,
  Dr = pe ? Symbol.for("react.lazy") : 60116,
  gl = pe ? Symbol.for("react.block") : 60121,
  ml = pe ? Symbol.for("react.fundamental") : 60117,
  vl = pe ? Symbol.for("react.responder") : 60118,
  hl = pe ? Symbol.for("react.scope") : 60119;
function Ie(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case xn:
        switch (((e = e.type), e)) {
          case Sn:
          case Ir:
          case hr:
          case yr:
          case br:
          case Cr:
            return e;
          default:
            switch (((e = e && e.$$typeof), e)) {
              case xr:
              case Sr:
              case Dr:
              case Er:
              case wr:
                return e;
              default:
                return t;
            }
        }
      case In:
        return t;
    }
  }
}
function So(e) {
  return Ie(e) === Ir;
}
oe.AsyncMode = Sn;
oe.ConcurrentMode = Ir;
oe.ContextConsumer = xr;
oe.ContextProvider = wr;
oe.Element = xn;
oe.ForwardRef = Sr;
oe.Fragment = hr;
oe.Lazy = Dr;
oe.Memo = Er;
oe.Portal = In;
oe.Profiler = yr;
oe.StrictMode = br;
oe.Suspense = Cr;
oe.isAsyncMode = function (e) {
  return So(e) || Ie(e) === Sn;
};
oe.isConcurrentMode = So;
oe.isContextConsumer = function (e) {
  return Ie(e) === xr;
};
oe.isContextProvider = function (e) {
  return Ie(e) === wr;
};
oe.isElement = function (e) {
  return typeof e == "object" && e !== null && e.$$typeof === xn;
};
oe.isForwardRef = function (e) {
  return Ie(e) === Sr;
};
oe.isFragment = function (e) {
  return Ie(e) === hr;
};
oe.isLazy = function (e) {
  return Ie(e) === Dr;
};
oe.isMemo = function (e) {
  return Ie(e) === Er;
};
oe.isPortal = function (e) {
  return Ie(e) === In;
};
oe.isProfiler = function (e) {
  return Ie(e) === yr;
};
oe.isStrictMode = function (e) {
  return Ie(e) === br;
};
oe.isSuspense = function (e) {
  return Ie(e) === Cr;
};
oe.isValidElementType = function (e) {
  return (
    typeof e == "string" ||
    typeof e == "function" ||
    e === hr ||
    e === Ir ||
    e === yr ||
    e === br ||
    e === Cr ||
    e === fl ||
    (typeof e == "object" &&
      e !== null &&
      (e.$$typeof === Dr ||
        e.$$typeof === Er ||
        e.$$typeof === wr ||
        e.$$typeof === xr ||
        e.$$typeof === Sr ||
        e.$$typeof === ml ||
        e.$$typeof === vl ||
        e.$$typeof === hl ||
        e.$$typeof === gl))
  );
};
oe.typeOf = Ie;
(function (e) {
  e.exports = oe;
})(Io);
var Cn = Io.exports,
  bl = {
    childContextTypes: !0,
    contextType: !0,
    contextTypes: !0,
    defaultProps: !0,
    displayName: !0,
    getDefaultProps: !0,
    getDerivedStateFromError: !0,
    getDerivedStateFromProps: !0,
    mixins: !0,
    propTypes: !0,
    type: !0,
  },
  yl = {
    name: !0,
    length: !0,
    prototype: !0,
    caller: !0,
    callee: !0,
    arguments: !0,
    arity: !0,
  },
  wl = {
    $$typeof: !0,
    render: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
  },
  Co = {
    $$typeof: !0,
    compare: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
    type: !0,
  },
  En = {};
En[Cn.ForwardRef] = wl;
En[Cn.Memo] = Co;
function mi(e) {
  return Cn.isMemo(e) ? Co : En[e.$$typeof] || bl;
}
var xl = Object.defineProperty,
  Il = Object.getOwnPropertyNames,
  vi = Object.getOwnPropertySymbols,
  Sl = Object.getOwnPropertyDescriptor,
  Cl = Object.getPrototypeOf,
  hi = Object.prototype;
function Eo(e, t, r) {
  if (typeof t != "string") {
    if (hi) {
      var n = Cl(t);
      n && n !== hi && Eo(e, n, r);
    }
    var i = Il(t);
    vi && (i = i.concat(vi(t)));
    for (var o = mi(e), a = mi(t), s = 0; s < i.length; ++s) {
      var u = i[s];
      if (!yl[u] && !(r && r[u]) && !(a && a[u]) && !(o && o[u])) {
        var d = Sl(t, u);
        try {
          xl(e, u, d);
        } catch {}
      }
    }
  }
  return e;
}
var bi = Eo,
  Do = { exports: {} },
  ae = {};
/** @license React v17.0.2
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var _r = 60103,
  Nr = 60106,
  Mt = 60107,
  At = 60108,
  Ot = 60114,
  Rt = 60109,
  Tt = 60110,
  Bt = 60112,
  Lt = 60113,
  Dn = 60120,
  Ft = 60115,
  Ut = 60116,
  _o = 60121,
  No = 60122,
  Po = 60117,
  ko = 60129,
  Mo = 60131;
if (typeof Symbol == "function" && Symbol.for) {
  var fe = Symbol.for;
  ((_r = fe("react.element")),
    (Nr = fe("react.portal")),
    (Mt = fe("react.fragment")),
    (At = fe("react.strict_mode")),
    (Ot = fe("react.profiler")),
    (Rt = fe("react.provider")),
    (Tt = fe("react.context")),
    (Bt = fe("react.forward_ref")),
    (Lt = fe("react.suspense")),
    (Dn = fe("react.suspense_list")),
    (Ft = fe("react.memo")),
    (Ut = fe("react.lazy")),
    (_o = fe("react.block")),
    (No = fe("react.server.block")),
    (Po = fe("react.fundamental")),
    (ko = fe("react.debug_trace_mode")),
    (Mo = fe("react.legacy_hidden")));
}
function ke(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case _r:
        switch (((e = e.type), e)) {
          case Mt:
          case Ot:
          case At:
          case Lt:
          case Dn:
            return e;
          default:
            switch (((e = e && e.$$typeof), e)) {
              case Tt:
              case Bt:
              case Ut:
              case Ft:
              case Rt:
                return e;
              default:
                return t;
            }
        }
      case Nr:
        return t;
    }
  }
}
var El = Rt,
  Dl = _r,
  _l = Bt,
  Nl = Mt,
  Pl = Ut,
  kl = Ft,
  Ml = Nr,
  Al = Ot,
  Ol = At,
  Rl = Lt;
ae.ContextConsumer = Tt;
ae.ContextProvider = El;
ae.Element = Dl;
ae.ForwardRef = _l;
ae.Fragment = Nl;
ae.Lazy = Pl;
ae.Memo = kl;
ae.Portal = Ml;
ae.Profiler = Al;
ae.StrictMode = Ol;
ae.Suspense = Rl;
ae.isAsyncMode = function () {
  return !1;
};
ae.isConcurrentMode = function () {
  return !1;
};
ae.isContextConsumer = function (e) {
  return ke(e) === Tt;
};
ae.isContextProvider = function (e) {
  return ke(e) === Rt;
};
ae.isElement = function (e) {
  return typeof e == "object" && e !== null && e.$$typeof === _r;
};
ae.isForwardRef = function (e) {
  return ke(e) === Bt;
};
ae.isFragment = function (e) {
  return ke(e) === Mt;
};
ae.isLazy = function (e) {
  return ke(e) === Ut;
};
ae.isMemo = function (e) {
  return ke(e) === Ft;
};
ae.isPortal = function (e) {
  return ke(e) === Nr;
};
ae.isProfiler = function (e) {
  return ke(e) === Ot;
};
ae.isStrictMode = function (e) {
  return ke(e) === At;
};
ae.isSuspense = function (e) {
  return ke(e) === Lt;
};
ae.isValidElementType = function (e) {
  return (
    typeof e == "string" ||
    typeof e == "function" ||
    e === Mt ||
    e === Ot ||
    e === ko ||
    e === At ||
    e === Lt ||
    e === Dn ||
    e === Mo ||
    (typeof e == "object" &&
      e !== null &&
      (e.$$typeof === Ut ||
        e.$$typeof === Ft ||
        e.$$typeof === Rt ||
        e.$$typeof === Tt ||
        e.$$typeof === Bt ||
        e.$$typeof === Po ||
        e.$$typeof === _o ||
        e[0] === No))
  );
};
ae.typeOf = ke;
(function (e) {
  e.exports = ae;
})(Do);
var Tl = [
    "getDisplayName",
    "methodName",
    "renderCountProp",
    "shouldHandleStateChanges",
    "storeKey",
    "withRef",
    "forwardRef",
    "context",
  ],
  Bl = ["reactReduxForwardedRef"],
  Ll = [],
  Fl = [null, null];
function Ul(e, t) {
  var r = e[1];
  return [t.payload, r + 1];
}
function yi(e, t, r) {
  xo(function () {
    return e.apply(void 0, t);
  }, r);
}
function ql(e, t, r, n, i, o, a) {
  ((e.current = n),
    (t.current = i),
    (r.current = !1),
    o.current && ((o.current = null), a()));
}
function $l(e, t, r, n, i, o, a, s, u, d) {
  if (!!e) {
    var c = !1,
      p = null,
      l = function () {
        if (!c) {
          var y = t.getState(),
            D,
            C;
          try {
            D = n(y, i.current);
          } catch (w) {
            ((C = w), (p = w));
          }
          (C || (p = null),
            D === o.current
              ? a.current || u()
              : ((o.current = D),
                (s.current = D),
                (a.current = !0),
                d({ type: "STORE_UPDATED", payload: { error: C } })));
        }
      };
    ((r.onStateChange = l), r.trySubscribe(), l());
    var g = function () {
      if (((c = !0), r.tryUnsubscribe(), (r.onStateChange = null), p)) throw p;
    };
    return g;
  }
}
var Gl = function () {
  return [null, 0];
};
function jl(e, t) {
  t === void 0 && (t = {});
  var r = t,
    n = r.getDisplayName,
    i =
      n === void 0
        ? function (P) {
            return "ConnectAdvanced(" + P + ")";
          }
        : n,
    o = r.methodName,
    a = o === void 0 ? "connectAdvanced" : o,
    s = r.renderCountProp,
    u = s === void 0 ? void 0 : s,
    d = r.shouldHandleStateChanges,
    c = d === void 0 ? !0 : d,
    p = r.storeKey,
    l = p === void 0 ? "store" : p;
  r.withRef;
  var g = r.forwardRef,
    h = g === void 0 ? !1 : g,
    y = r.context,
    D = y === void 0 ? bo : y,
    C = ir(r, Tl),
    w = D;
  return function (_) {
    var N = _.displayName || _.name || "Component",
      B = i(N),
      W = Q({}, C, {
        getDisplayName: i,
        methodName: a,
        renderCountProp: u,
        shouldHandleStateChanges: c,
        storeKey: l,
        displayName: B,
        wrappedComponentName: N,
        WrappedComponent: _,
      }),
      X = C.pure;
    function V(v) {
      return e(v.dispatch, W);
    }
    var k = X
      ? x.exports.useMemo
      : function (v) {
          return v();
        };
    function O(v) {
      var b = x.exports.useMemo(
          function () {
            var Le = v.reactReduxForwardedRef,
              rt = ir(v, Bl);
            return [v.context, Le, rt];
          },
          [v],
        ),
        E = b[0],
        R = b[1],
        T = b[2],
        L = x.exports.useMemo(
          function () {
            return E &&
              E.Consumer &&
              Do.exports.isContextConsumer(ce.createElement(E.Consumer, null))
              ? E
              : w;
          },
          [E, w],
        ),
        j = x.exports.useContext(L),
        $ =
          Boolean(v.store) &&
          Boolean(v.store.getState) &&
          Boolean(v.store.dispatch);
      Boolean(j) && Boolean(j.store);
      var K = $ ? v.store : j.store,
        G = x.exports.useMemo(
          function () {
            return V(K);
          },
          [K],
        ),
        A = x.exports.useMemo(
          function () {
            if (!c) return Fl;
            var Le = wo(K, $ ? null : j.subscription),
              rt = Le.notifyNestedSubs.bind(Le);
            return [Le, rt];
          },
          [K, $, j],
        ),
        J = A[0],
        Z = A[1],
        le = x.exports.useMemo(
          function () {
            return $ ? j : Q({}, j, { subscription: J });
          },
          [$, j, J],
        ),
        ee = x.exports.useReducer(Ul, Ll, Gl),
        _e = ee[0],
        Oe = _e[0],
        ze = ee[1];
      if (Oe && Oe.error) throw Oe.error;
      var pt = x.exports.useRef(),
        et = x.exports.useRef(T),
        Be = x.exports.useRef(),
        Me = x.exports.useRef(!1),
        Ne = k(
          function () {
            return Be.current && T === et.current
              ? Be.current
              : G(K.getState(), T);
          },
          [K, Oe, T],
        );
      (yi(ql, [et, pt, Me, T, Ne, Be, Z]),
        yi($l, [c, K, J, G, et, pt, Me, Be, Z, ze], [K, J, G]));
      var tt = x.exports.useMemo(
          function () {
            return f(_, { ...Ne, ref: R });
          },
          [R, _, Ne],
        ),
        jt = x.exports.useMemo(
          function () {
            return c ? f(L.Provider, { value: le, children: tt }) : tt;
          },
          [L, tt, le],
        );
      return jt;
    }
    var q = X ? ce.memo(O) : O;
    if (((q.WrappedComponent = _), (q.displayName = O.displayName = B), h)) {
      var m = ce.forwardRef(function (b, E) {
        return f(q, { ...b, reactReduxForwardedRef: E });
      });
      return ((m.displayName = B), (m.WrappedComponent = _), bi(m, _));
    }
    return bi(q, _);
  };
}
function wi(e, t) {
  return e === t ? e !== 0 || t !== 0 || 1 / e === 1 / t : e !== e && t !== t;
}
function $r(e, t) {
  if (wi(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  var r = Object.keys(e),
    n = Object.keys(t);
  if (r.length !== n.length) return !1;
  for (var i = 0; i < r.length; i++)
    if (!Object.prototype.hasOwnProperty.call(t, r[i]) || !wi(e[r[i]], t[r[i]]))
      return !1;
  return !0;
}
function Wl(e, t) {
  var r = {},
    n = function (a) {
      var s = e[a];
      typeof s == "function" &&
        (r[a] = function () {
          return t(s.apply(void 0, arguments));
        });
    };
  for (var i in e) n(i);
  return r;
}
function _n(e) {
  return function (r, n) {
    var i = e(r, n);
    function o() {
      return i;
    }
    return ((o.dependsOnOwnProps = !1), o);
  };
}
function xi(e) {
  return e.dependsOnOwnProps !== null && e.dependsOnOwnProps !== void 0
    ? Boolean(e.dependsOnOwnProps)
    : e.length !== 1;
}
function Ao(e, t) {
  return function (n, i) {
    i.displayName;
    var o = function (s, u) {
      return o.dependsOnOwnProps ? o.mapToProps(s, u) : o.mapToProps(s);
    };
    return (
      (o.dependsOnOwnProps = !0),
      (o.mapToProps = function (s, u) {
        ((o.mapToProps = e), (o.dependsOnOwnProps = xi(e)));
        var d = o(s, u);
        return (
          typeof d == "function" &&
            ((o.mapToProps = d), (o.dependsOnOwnProps = xi(d)), (d = o(s, u))),
          d
        );
      }),
      o
    );
  };
}
function Vl(e) {
  return typeof e == "function" ? Ao(e) : void 0;
}
function Hl(e) {
  return e
    ? void 0
    : _n(function (t) {
        return { dispatch: t };
      });
}
function zl(e) {
  return e && typeof e == "object"
    ? _n(function (t) {
        return Wl(e, t);
      })
    : void 0;
}
const Kl = [Vl, Hl, zl];
function Jl(e) {
  return typeof e == "function" ? Ao(e) : void 0;
}
function Yl(e) {
  return e
    ? void 0
    : _n(function () {
        return {};
      });
}
const Ql = [Jl, Yl];
function Xl(e, t, r) {
  return Q({}, r, e, t);
}
function Zl(e) {
  return function (r, n) {
    n.displayName;
    var i = n.pure,
      o = n.areMergedPropsEqual,
      a = !1,
      s;
    return function (d, c, p) {
      var l = e(d, c, p);
      return (a ? (!i || !o(l, s)) && (s = l) : ((a = !0), (s = l)), s);
    };
  };
}
function ec(e) {
  return typeof e == "function" ? Zl(e) : void 0;
}
function tc(e) {
  return e
    ? void 0
    : function () {
        return Xl;
      };
}
const rc = [ec, tc];
var nc = ["initMapStateToProps", "initMapDispatchToProps", "initMergeProps"];
function ic(e, t, r, n) {
  return function (o, a) {
    return r(e(o, a), t(n, a), a);
  };
}
function oc(e, t, r, n, i) {
  var o = i.areStatesEqual,
    a = i.areOwnPropsEqual,
    s = i.areStatePropsEqual,
    u = !1,
    d,
    c,
    p,
    l,
    g;
  function h(P, _) {
    return (
      (d = P),
      (c = _),
      (p = e(d, c)),
      (l = t(n, c)),
      (g = r(p, l, c)),
      (u = !0),
      g
    );
  }
  function y() {
    return (
      (p = e(d, c)),
      t.dependsOnOwnProps && (l = t(n, c)),
      (g = r(p, l, c)),
      g
    );
  }
  function D() {
    return (
      e.dependsOnOwnProps && (p = e(d, c)),
      t.dependsOnOwnProps && (l = t(n, c)),
      (g = r(p, l, c)),
      g
    );
  }
  function C() {
    var P = e(d, c),
      _ = !s(P, p);
    return ((p = P), _ && (g = r(p, l, c)), g);
  }
  function w(P, _) {
    var N = !a(_, c),
      B = !o(P, d, _, c);
    return ((d = P), (c = _), N && B ? y() : N ? D() : B ? C() : g);
  }
  return function (_, N) {
    return u ? w(_, N) : h(_, N);
  };
}
function ac(e, t) {
  var r = t.initMapStateToProps,
    n = t.initMapDispatchToProps,
    i = t.initMergeProps,
    o = ir(t, nc),
    a = r(e, o),
    s = n(e, o),
    u = i(e, o),
    d = o.pure ? oc : ic;
  return d(a, s, u, e, o);
}
var sc = [
  "pure",
  "areStatesEqual",
  "areOwnPropsEqual",
  "areStatePropsEqual",
  "areMergedPropsEqual",
];
function Gr(e, t, r) {
  for (var n = t.length - 1; n >= 0; n--) {
    var i = t[n](e);
    if (i) return i;
  }
  return function (o, a) {
    throw new Error(
      "Invalid value of type " +
        typeof e +
        " for " +
        r +
        " argument when connecting component " +
        a.wrappedComponentName +
        ".",
    );
  };
}
function lc(e, t) {
  return e === t;
}
function cc(e) {
  var t = e === void 0 ? {} : e,
    r = t.connectHOC,
    n = r === void 0 ? jl : r,
    i = t.mapStateToPropsFactories,
    o = i === void 0 ? Ql : i,
    a = t.mapDispatchToPropsFactories,
    s = a === void 0 ? Kl : a,
    u = t.mergePropsFactories,
    d = u === void 0 ? rc : u,
    c = t.selectorFactory,
    p = c === void 0 ? ac : c;
  return function (g, h, y, D) {
    D === void 0 && (D = {});
    var C = D,
      w = C.pure,
      P = w === void 0 ? !0 : w,
      _ = C.areStatesEqual,
      N = _ === void 0 ? lc : _,
      B = C.areOwnPropsEqual,
      W = B === void 0 ? $r : B,
      X = C.areStatePropsEqual,
      V = X === void 0 ? $r : X,
      k = C.areMergedPropsEqual,
      O = k === void 0 ? $r : k,
      q = ir(C, sc),
      m = Gr(g, o, "mapStateToProps"),
      v = Gr(h, s, "mapDispatchToProps"),
      b = Gr(y, d, "mergeProps");
    return n(
      p,
      Q(
        {
          methodName: "connect",
          getDisplayName: function (R) {
            return "Connect(" + R + ")";
          },
          shouldHandleStateChanges: Boolean(g),
          initMapStateToProps: m,
          initMapDispatchToProps: v,
          initMergeProps: b,
          pure: P,
          areStatesEqual: N,
          areOwnPropsEqual: W,
          areStatePropsEqual: V,
          areMergedPropsEqual: O,
        },
        q,
      ),
    );
  };
}
const Oo = cc();
cl(cs.exports.unstable_batchedUpdates);
function uc(e, t) {
  if (e.length !== t.length) return !1;
  for (var r = 0; r < e.length; r++) if (e[r] !== t[r]) return !1;
  return !0;
}
function Ro(e, t) {
  var r = x.exports.useState(function () {
      return { inputs: t, result: e() };
    })[0],
    n = x.exports.useRef(!0),
    i = x.exports.useRef(r),
    o = n.current || Boolean(t && i.current.inputs && uc(t, i.current.inputs)),
    a = o ? i.current : { inputs: t, result: e() };
  return (
    x.exports.useEffect(
      function () {
        ((n.current = !1), (i.current = a));
      },
      [a],
    ),
    a.result
  );
}
function dc(e, t) {
  return Ro(function () {
    return e;
  }, t);
}
var ne = Ro,
  H = dc,
  pc = !0,
  jr = "Invariant failed";
function fc(e, t) {
  if (!e) {
    if (pc) throw new Error(jr);
    var r = typeof t == "function" ? t() : t,
      n = r ? "".concat(jr, ": ").concat(r) : jr;
    throw new Error(n);
  }
}
var Pe = function (t) {
    var r = t.top,
      n = t.right,
      i = t.bottom,
      o = t.left,
      a = n - o,
      s = i - r,
      u = {
        top: r,
        right: n,
        bottom: i,
        left: o,
        width: a,
        height: s,
        x: o,
        y: r,
        center: { x: (n + o) / 2, y: (i + r) / 2 },
      };
    return u;
  },
  Nn = function (t, r) {
    return {
      top: t.top - r.top,
      left: t.left - r.left,
      bottom: t.bottom + r.bottom,
      right: t.right + r.right,
    };
  },
  Ii = function (t, r) {
    return {
      top: t.top + r.top,
      left: t.left + r.left,
      bottom: t.bottom - r.bottom,
      right: t.right - r.right,
    };
  },
  gc = function (t, r) {
    return {
      top: t.top + r.y,
      left: t.left + r.x,
      bottom: t.bottom + r.y,
      right: t.right + r.x,
    };
  },
  Wr = { top: 0, right: 0, bottom: 0, left: 0 },
  Pn = function (t) {
    var r = t.borderBox,
      n = t.margin,
      i = n === void 0 ? Wr : n,
      o = t.border,
      a = o === void 0 ? Wr : o,
      s = t.padding,
      u = s === void 0 ? Wr : s,
      d = Pe(Nn(r, i)),
      c = Pe(Ii(r, a)),
      p = Pe(Ii(c, u));
    return {
      marginBox: d,
      borderBox: Pe(r),
      paddingBox: c,
      contentBox: p,
      margin: i,
      border: a,
      padding: u,
    };
  },
  Se = function (t) {
    var r = t.slice(0, -2),
      n = t.slice(-2);
    if (n !== "px") return 0;
    var i = Number(r);
    return (isNaN(i) && fc(!1), i);
  },
  mc = function () {
    return { x: window.pageXOffset, y: window.pageYOffset };
  },
  or = function (t, r) {
    var n = t.borderBox,
      i = t.border,
      o = t.margin,
      a = t.padding,
      s = gc(n, r);
    return Pn({ borderBox: s, border: i, margin: o, padding: a });
  },
  ar = function (t, r) {
    return (r === void 0 && (r = mc()), or(t, r));
  },
  To = function (t, r) {
    var n = {
        top: Se(r.marginTop),
        right: Se(r.marginRight),
        bottom: Se(r.marginBottom),
        left: Se(r.marginLeft),
      },
      i = {
        top: Se(r.paddingTop),
        right: Se(r.paddingRight),
        bottom: Se(r.paddingBottom),
        left: Se(r.paddingLeft),
      },
      o = {
        top: Se(r.borderTopWidth),
        right: Se(r.borderRightWidth),
        bottom: Se(r.borderBottomWidth),
        left: Se(r.borderLeftWidth),
      };
    return Pn({ borderBox: t, margin: n, padding: i, border: o });
  },
  Bo = function (t) {
    var r = t.getBoundingClientRect(),
      n = window.getComputedStyle(t);
    return To(r, n);
  },
  Si =
    Number.isNaN ||
    function (t) {
      return typeof t == "number" && t !== t;
    };
function vc(e, t) {
  return !!(e === t || (Si(e) && Si(t)));
}
function hc(e, t) {
  if (e.length !== t.length) return !1;
  for (var r = 0; r < e.length; r++) if (!vc(e[r], t[r])) return !1;
  return !0;
}
function ue(e, t) {
  t === void 0 && (t = hc);
  var r,
    n = [],
    i,
    o = !1;
  function a() {
    for (var s = [], u = 0; u < arguments.length; u++) s[u] = arguments[u];
    return (
      (o && r === this && t(s, n)) ||
        ((i = e.apply(this, s)), (o = !0), (r = this), (n = s)),
      i
    );
  }
  return a;
}
var bc = function (t) {
  var r = [],
    n = null,
    i = function () {
      for (var a = arguments.length, s = new Array(a), u = 0; u < a; u++)
        s[u] = arguments[u];
      ((r = s),
        !n &&
          (n = requestAnimationFrame(function () {
            ((n = null), t.apply(void 0, r));
          })));
    };
  return (
    (i.cancel = function () {
      !n || (cancelAnimationFrame(n), (n = null));
    }),
    i
  );
};
const St = bc;
function Lo(e, t) {}
Lo.bind(null, "warn");
Lo.bind(null, "error");
function qe() {}
function yc(e, t) {
  return Q({}, e, {}, t);
}
function Ee(e, t, r) {
  var n = t.map(function (i) {
    var o = yc(r, i.options);
    return (
      e.addEventListener(i.eventName, i.fn, o),
      function () {
        e.removeEventListener(i.eventName, i.fn, o);
      }
    );
  });
  return function () {
    n.forEach(function (o) {
      o();
    });
  };
}
var wc = "Invariant failed";
function sr(e) {
  this.message = e;
}
sr.prototype.toString = function () {
  return this.message;
};
function U(e, t) {
  if (!e) throw new sr(wc);
}
var xc = (function (e) {
    mo(t, e);
    function t() {
      for (var n, i = arguments.length, o = new Array(i), a = 0; a < i; a++)
        o[a] = arguments[a];
      return (
        (n = e.call.apply(e, [this].concat(o)) || this),
        (n.callbacks = null),
        (n.unbind = qe),
        (n.onWindowError = function (s) {
          var u = n.getCallbacks();
          u.isDragging() && u.tryAbort();
          var d = s.error;
          d instanceof sr && s.preventDefault();
        }),
        (n.getCallbacks = function () {
          if (!n.callbacks)
            throw new Error("Unable to find AppCallbacks in <ErrorBoundary/>");
          return n.callbacks;
        }),
        (n.setCallbacks = function (s) {
          n.callbacks = s;
        }),
        n
      );
    }
    var r = t.prototype;
    return (
      (r.componentDidMount = function () {
        this.unbind = Ee(window, [
          { eventName: "error", fn: this.onWindowError },
        ]);
      }),
      (r.componentDidCatch = function (i) {
        if (i instanceof sr) {
          this.setState({});
          return;
        }
        throw i;
      }),
      (r.componentWillUnmount = function () {
        this.unbind();
      }),
      (r.render = function () {
        return this.props.children(this.setCallbacks);
      }),
      t
    );
  })(ce.Component),
  Ic = `
  Press space bar to start a drag.
  When dragging you can use the arrow keys to move the item around and escape to cancel.
  Some screen readers may require you to be in focus mode or to use your pass through key
`,
  lr = function (t) {
    return t + 1;
  },
  Sc = function (t) {
    return (
      `
  You have lifted an item in position ` +
      lr(t.source.index) +
      `
`
    );
  },
  Fo = function (t, r) {
    var n = t.droppableId === r.droppableId,
      i = lr(t.index),
      o = lr(r.index);
    return n
      ? `
      You have moved the item from position ` +
          i +
          `
      to position ` +
          o +
          `
    `
      : `
    You have moved the item from position ` +
          i +
          `
    in list ` +
          t.droppableId +
          `
    to list ` +
          r.droppableId +
          `
    in position ` +
          o +
          `
  `;
  },
  Uo = function (t, r, n) {
    var i = r.droppableId === n.droppableId;
    return i
      ? `
      The item ` +
          t +
          `
      has been combined with ` +
          n.draggableId
      : `
      The item ` +
          t +
          `
      in list ` +
          r.droppableId +
          `
      has been combined with ` +
          n.draggableId +
          `
      in list ` +
          n.droppableId +
          `
    `;
  },
  Cc = function (t) {
    var r = t.destination;
    if (r) return Fo(t.source, r);
    var n = t.combine;
    return n
      ? Uo(t.draggableId, t.source, n)
      : "You are over an area that cannot be dropped on";
  },
  Ci = function (t) {
    return (
      `
  The item has returned to its starting position
  of ` +
      lr(t.index) +
      `
`
    );
  },
  Ec = function (t) {
    if (t.reason === "CANCEL")
      return (
        `
      Movement cancelled.
      ` +
        Ci(t.source) +
        `
    `
      );
    var r = t.destination,
      n = t.combine;
    return r
      ? `
      You have dropped the item.
      ` +
          Fo(t.source, r) +
          `
    `
      : n
        ? `
      You have dropped the item.
      ` +
          Uo(t.draggableId, t.source, n) +
          `
    `
        : `
    The item has been dropped while not over a drop area.
    ` +
          Ci(t.source) +
          `
  `;
  },
  tr = {
    dragHandleUsageInstructions: Ic,
    onDragStart: Sc,
    onDragUpdate: Cc,
    onDragEnd: Ec,
  },
  de = { x: 0, y: 0 },
  ge = function (t, r) {
    return { x: t.x + r.x, y: t.y + r.y };
  },
  ye = function (t, r) {
    return { x: t.x - r.x, y: t.y - r.y };
  },
  $e = function (t, r) {
    return t.x === r.x && t.y === r.y;
  },
  lt = function (t) {
    return { x: t.x !== 0 ? -t.x : 0, y: t.y !== 0 ? -t.y : 0 };
  },
  Xe = function (t, r, n) {
    var i;
    return (
      n === void 0 && (n = 0),
      (i = {}),
      (i[t] = r),
      (i[t === "x" ? "y" : "x"] = n),
      i
    );
  },
  Ct = function (t, r) {
    return Math.sqrt(Math.pow(r.x - t.x, 2) + Math.pow(r.y - t.y, 2));
  },
  Ei = function (t, r) {
    return Math.min.apply(
      Math,
      r.map(function (n) {
        return Ct(t, n);
      }),
    );
  },
  qo = function (t) {
    return function (r) {
      return { x: t(r.x), y: t(r.y) };
    };
  },
  Dc = function (e, t) {
    var r = Pe({
      top: Math.max(t.top, e.top),
      right: Math.min(t.right, e.right),
      bottom: Math.min(t.bottom, e.bottom),
      left: Math.max(t.left, e.left),
    });
    return r.width <= 0 || r.height <= 0 ? null : r;
  },
  qt = function (t, r) {
    return {
      top: t.top + r.y,
      left: t.left + r.x,
      bottom: t.bottom + r.y,
      right: t.right + r.x,
    };
  },
  Di = function (t) {
    return [
      { x: t.left, y: t.top },
      { x: t.right, y: t.top },
      { x: t.left, y: t.bottom },
      { x: t.right, y: t.bottom },
    ];
  },
  _c = { top: 0, right: 0, bottom: 0, left: 0 },
  Nc = function (t, r) {
    return r ? qt(t, r.scroll.diff.displacement) : t;
  },
  Pc = function (t, r, n) {
    if (n && n.increasedBy) {
      var i;
      return Q(
        {},
        t,
        ((i = {}), (i[r.end] = t[r.end] + n.increasedBy[r.line]), i),
      );
    }
    return t;
  },
  kc = function (t, r) {
    return r && r.shouldClipSubject ? Dc(r.pageMarginBox, t) : Pe(t);
  },
  ot = function (e) {
    var t = e.page,
      r = e.withPlaceholder,
      n = e.axis,
      i = e.frame,
      o = Nc(t.marginBox, i),
      a = Pc(o, n, r),
      s = kc(a, i);
    return { page: t, withPlaceholder: r, active: s };
  },
  kn = function (e, t) {
    e.frame || U(!1);
    var r = e.frame,
      n = ye(t, r.scroll.initial),
      i = lt(n),
      o = Q({}, r, {
        scroll: {
          initial: r.scroll.initial,
          current: t,
          diff: { value: n, displacement: i },
          max: r.scroll.max,
        },
      }),
      a = ot({
        page: e.subject.page,
        withPlaceholder: e.subject.withPlaceholder,
        axis: e.axis,
        frame: o,
      }),
      s = Q({}, e, { frame: o, subject: a });
    return s;
  };
function cr(e) {
  return Object.values
    ? Object.values(e)
    : Object.keys(e).map(function (t) {
        return e[t];
      });
}
function Mn(e, t) {
  if (e.findIndex) return e.findIndex(t);
  for (var r = 0; r < e.length; r++) if (t(e[r])) return r;
  return -1;
}
function Ve(e, t) {
  if (e.find) return e.find(t);
  var r = Mn(e, t);
  if (r !== -1) return e[r];
}
function $o(e) {
  return Array.prototype.slice.call(e);
}
var Go = ue(function (e) {
    return e.reduce(function (t, r) {
      return ((t[r.descriptor.id] = r), t);
    }, {});
  }),
  jo = ue(function (e) {
    return e.reduce(function (t, r) {
      return ((t[r.descriptor.id] = r), t);
    }, {});
  }),
  Pr = ue(function (e) {
    return cr(e);
  }),
  Mc = ue(function (e) {
    return cr(e);
  }),
  ct = ue(function (e, t) {
    var r = Mc(t)
      .filter(function (n) {
        return e === n.descriptor.droppableId;
      })
      .sort(function (n, i) {
        return n.descriptor.index - i.descriptor.index;
      });
    return r;
  });
function An(e) {
  return e.at && e.at.type === "REORDER" ? e.at.destination : null;
}
function kr(e) {
  return e.at && e.at.type === "COMBINE" ? e.at.combine : null;
}
var Mr = ue(function (e, t) {
    return t.filter(function (r) {
      return r.descriptor.id !== e.descriptor.id;
    });
  }),
  Ac = function (e) {
    var t = e.isMovingForward,
      r = e.draggable,
      n = e.destination,
      i = e.insideDestination,
      o = e.previousImpact;
    if (!n.isCombineEnabled) return null;
    var a = An(o);
    if (!a) return null;
    function s(y) {
      var D = {
        type: "COMBINE",
        combine: { draggableId: y, droppableId: n.descriptor.id },
      };
      return Q({}, o, { at: D });
    }
    var u = o.displaced.all,
      d = u.length ? u[0] : null;
    if (t) return d ? s(d) : null;
    var c = Mr(r, i);
    if (!d) {
      if (!c.length) return null;
      var p = c[c.length - 1];
      return s(p.descriptor.id);
    }
    var l = Mn(c, function (y) {
      return y.descriptor.id === d;
    });
    l === -1 && U(!1);
    var g = l - 1;
    if (g < 0) return null;
    var h = c[g];
    return s(h.descriptor.id);
  },
  ut = function (e, t) {
    return e.descriptor.droppableId === t.descriptor.id;
  },
  Wo = { point: de, value: 0 },
  Et = { invisible: {}, visible: {}, all: [] },
  Oc = { displaced: Et, displacedBy: Wo, at: null },
  De = function (e, t) {
    return function (r) {
      return e <= r && r <= t;
    };
  },
  Vo = function (e) {
    var t = De(e.top, e.bottom),
      r = De(e.left, e.right);
    return function (n) {
      var i = t(n.top) && t(n.bottom) && r(n.left) && r(n.right);
      if (i) return !0;
      var o = t(n.top) || t(n.bottom),
        a = r(n.left) || r(n.right),
        s = o && a;
      if (s) return !0;
      var u = n.top < e.top && n.bottom > e.bottom,
        d = n.left < e.left && n.right > e.right,
        c = u && d;
      if (c) return !0;
      var p = (u && a) || (d && o);
      return p;
    };
  },
  Rc = function (e) {
    var t = De(e.top, e.bottom),
      r = De(e.left, e.right);
    return function (n) {
      var i = t(n.top) && t(n.bottom) && r(n.left) && r(n.right);
      return i;
    };
  },
  On = {
    direction: "vertical",
    line: "y",
    crossAxisLine: "x",
    start: "top",
    end: "bottom",
    size: "height",
    crossAxisStart: "left",
    crossAxisEnd: "right",
    crossAxisSize: "width",
  },
  Ho = {
    direction: "horizontal",
    line: "x",
    crossAxisLine: "y",
    start: "left",
    end: "right",
    size: "width",
    crossAxisStart: "top",
    crossAxisEnd: "bottom",
    crossAxisSize: "height",
  },
  Tc = function (e) {
    return function (t) {
      var r = De(t.top, t.bottom),
        n = De(t.left, t.right);
      return function (i) {
        return e === On ? r(i.top) && r(i.bottom) : n(i.left) && n(i.right);
      };
    };
  },
  Bc = function (t, r) {
    var n = r.frame ? r.frame.scroll.diff.displacement : de;
    return qt(t, n);
  },
  Lc = function (t, r, n) {
    return r.subject.active ? n(r.subject.active)(t) : !1;
  },
  Fc = function (t, r, n) {
    return n(r)(t);
  },
  Rn = function (t) {
    var r = t.target,
      n = t.destination,
      i = t.viewport,
      o = t.withDroppableDisplacement,
      a = t.isVisibleThroughFrameFn,
      s = o ? Bc(r, n) : r;
    return Lc(s, n, a) && Fc(s, i, a);
  },
  Uc = function (t) {
    return Rn(Q({}, t, { isVisibleThroughFrameFn: Vo }));
  },
  zo = function (t) {
    return Rn(Q({}, t, { isVisibleThroughFrameFn: Rc }));
  },
  qc = function (t) {
    return Rn(Q({}, t, { isVisibleThroughFrameFn: Tc(t.destination.axis) }));
  },
  $c = function (t, r, n) {
    if (typeof n == "boolean") return n;
    if (!r) return !0;
    var i = r.invisible,
      o = r.visible;
    if (i[t]) return !1;
    var a = o[t];
    return a ? a.shouldAnimate : !0;
  };
function Gc(e, t) {
  var r = e.page.marginBox,
    n = { top: t.point.y, right: 0, bottom: 0, left: t.point.x };
  return Pe(Nn(r, n));
}
function Dt(e) {
  var t = e.afterDragging,
    r = e.destination,
    n = e.displacedBy,
    i = e.viewport,
    o = e.forceShouldAnimate,
    a = e.last;
  return t.reduce(
    function (u, d) {
      var c = Gc(d, n),
        p = d.descriptor.id;
      u.all.push(p);
      var l = Uc({
        target: c,
        destination: r,
        viewport: i,
        withDroppableDisplacement: !0,
      });
      if (!l) return ((u.invisible[d.descriptor.id] = !0), u);
      var g = $c(p, a, o),
        h = { draggableId: p, shouldAnimate: g };
      return ((u.visible[p] = h), u);
    },
    { all: [], visible: {}, invisible: {} },
  );
}
function jc(e, t) {
  if (!e.length) return 0;
  var r = e[e.length - 1].descriptor.index;
  return t.inHomeList ? r : r + 1;
}
function _i(e) {
  var t = e.insideDestination,
    r = e.inHomeList,
    n = e.displacedBy,
    i = e.destination,
    o = jc(t, { inHomeList: r });
  return {
    displaced: Et,
    displacedBy: n,
    at: {
      type: "REORDER",
      destination: { droppableId: i.descriptor.id, index: o },
    },
  };
}
function ur(e) {
  var t = e.draggable,
    r = e.insideDestination,
    n = e.destination,
    i = e.viewport,
    o = e.displacedBy,
    a = e.last,
    s = e.index,
    u = e.forceShouldAnimate,
    d = ut(t, n);
  if (s == null)
    return _i({
      insideDestination: r,
      inHomeList: d,
      displacedBy: o,
      destination: n,
    });
  var c = Ve(r, function (y) {
    return y.descriptor.index === s;
  });
  if (!c)
    return _i({
      insideDestination: r,
      inHomeList: d,
      displacedBy: o,
      destination: n,
    });
  var p = Mr(t, r),
    l = r.indexOf(c),
    g = p.slice(l),
    h = Dt({
      afterDragging: g,
      destination: n,
      displacedBy: o,
      last: a,
      viewport: i.frame,
      forceShouldAnimate: u,
    });
  return {
    displaced: h,
    displacedBy: o,
    at: {
      type: "REORDER",
      destination: { droppableId: n.descriptor.id, index: s },
    },
  };
}
function je(e, t) {
  return Boolean(t.effected[e]);
}
var Wc = function (e) {
    var t = e.isMovingForward,
      r = e.destination,
      n = e.draggables,
      i = e.combine,
      o = e.afterCritical;
    if (!r.isCombineEnabled) return null;
    var a = i.draggableId,
      s = n[a],
      u = s.descriptor.index,
      d = je(a, o);
    return d ? (t ? u : u - 1) : t ? u + 1 : u;
  },
  Vc = function (e) {
    var t = e.isMovingForward,
      r = e.isInHomeList,
      n = e.insideDestination,
      i = e.location;
    if (!n.length) return null;
    var o = i.index,
      a = t ? o + 1 : o - 1,
      s = n[0].descriptor.index,
      u = n[n.length - 1].descriptor.index,
      d = r ? u : u + 1;
    return a < s || a > d ? null : a;
  },
  Hc = function (e) {
    var t = e.isMovingForward,
      r = e.isInHomeList,
      n = e.draggable,
      i = e.draggables,
      o = e.destination,
      a = e.insideDestination,
      s = e.previousImpact,
      u = e.viewport,
      d = e.afterCritical,
      c = s.at;
    if ((c || U(!1), c.type === "REORDER")) {
      var p = Vc({
        isMovingForward: t,
        isInHomeList: r,
        location: c.destination,
        insideDestination: a,
      });
      return p == null
        ? null
        : ur({
            draggable: n,
            insideDestination: a,
            destination: o,
            viewport: u,
            last: s.displaced,
            displacedBy: s.displacedBy,
            index: p,
          });
    }
    var l = Wc({
      isMovingForward: t,
      destination: o,
      displaced: s.displaced,
      draggables: i,
      combine: c.combine,
      afterCritical: d,
    });
    return l == null
      ? null
      : ur({
          draggable: n,
          insideDestination: a,
          destination: o,
          viewport: u,
          last: s.displaced,
          displacedBy: s.displacedBy,
          index: l,
        });
  },
  zc = function (e) {
    var t = e.displaced,
      r = e.afterCritical,
      n = e.combineWith,
      i = e.displacedBy,
      o = Boolean(t.visible[n] || t.invisible[n]);
    return je(n, r) ? (o ? de : lt(i.point)) : o ? i.point : de;
  },
  Kc = function (e) {
    var t = e.afterCritical,
      r = e.impact,
      n = e.draggables,
      i = kr(r);
    i || U(!1);
    var o = i.draggableId,
      a = n[o].page.borderBox.center,
      s = zc({
        displaced: r.displaced,
        afterCritical: t,
        combineWith: o,
        displacedBy: r.displacedBy,
      });
    return ge(a, s);
  },
  Ko = function (t, r) {
    return r.margin[t.start] + r.borderBox[t.size] / 2;
  },
  Jc = function (t, r) {
    return r.margin[t.end] + r.borderBox[t.size] / 2;
  },
  Tn = function (t, r, n) {
    return (
      r[t.crossAxisStart] +
      n.margin[t.crossAxisStart] +
      n.borderBox[t.crossAxisSize] / 2
    );
  },
  Ni = function (t) {
    var r = t.axis,
      n = t.moveRelativeTo,
      i = t.isMoving;
    return Xe(r.line, n.marginBox[r.end] + Ko(r, i), Tn(r, n.marginBox, i));
  },
  Pi = function (t) {
    var r = t.axis,
      n = t.moveRelativeTo,
      i = t.isMoving;
    return Xe(r.line, n.marginBox[r.start] - Jc(r, i), Tn(r, n.marginBox, i));
  },
  Yc = function (t) {
    var r = t.axis,
      n = t.moveInto,
      i = t.isMoving;
    return Xe(r.line, n.contentBox[r.start] + Ko(r, i), Tn(r, n.contentBox, i));
  },
  Qc = function (e) {
    var t = e.impact,
      r = e.draggable,
      n = e.draggables,
      i = e.droppable,
      o = e.afterCritical,
      a = ct(i.descriptor.id, n),
      s = r.page,
      u = i.axis;
    if (!a.length) return Yc({ axis: u, moveInto: i.page, isMoving: s });
    var d = t.displaced,
      c = t.displacedBy,
      p = d.all[0];
    if (p) {
      var l = n[p];
      if (je(p, o)) return Pi({ axis: u, moveRelativeTo: l.page, isMoving: s });
      var g = or(l.page, c.point);
      return Pi({ axis: u, moveRelativeTo: g, isMoving: s });
    }
    var h = a[a.length - 1];
    if (h.descriptor.id === r.descriptor.id) return s.borderBox.center;
    if (je(h.descriptor.id, o)) {
      var y = or(h.page, lt(o.displacedBy.point));
      return Ni({ axis: u, moveRelativeTo: y, isMoving: s });
    }
    return Ni({ axis: u, moveRelativeTo: h.page, isMoving: s });
  },
  dn = function (e, t) {
    var r = e.frame;
    return r ? ge(t, r.scroll.diff.displacement) : t;
  },
  Xc = function (t) {
    var r = t.impact,
      n = t.draggable,
      i = t.droppable,
      o = t.draggables,
      a = t.afterCritical,
      s = n.page.borderBox.center,
      u = r.at;
    return !i || !u
      ? s
      : u.type === "REORDER"
        ? Qc({
            impact: r,
            draggable: n,
            draggables: o,
            droppable: i,
            afterCritical: a,
          })
        : Kc({ impact: r, draggables: o, afterCritical: a });
  },
  Ar = function (e) {
    var t = Xc(e),
      r = e.droppable,
      n = r ? dn(r, t) : t;
    return n;
  },
  Jo = function (e, t) {
    var r = ye(t, e.scroll.initial),
      n = lt(r),
      i = Pe({
        top: t.y,
        bottom: t.y + e.frame.height,
        left: t.x,
        right: t.x + e.frame.width,
      }),
      o = {
        frame: i,
        scroll: {
          initial: e.scroll.initial,
          max: e.scroll.max,
          current: t,
          diff: { value: r, displacement: n },
        },
      };
    return o;
  };
function ki(e, t) {
  return e.map(function (r) {
    return t[r];
  });
}
function Zc(e, t) {
  for (var r = 0; r < t.length; r++) {
    var n = t[r].visible[e];
    if (n) return n;
  }
  return null;
}
var eu = function (e) {
    var t = e.impact,
      r = e.viewport,
      n = e.destination,
      i = e.draggables,
      o = e.maxScrollChange,
      a = Jo(r, ge(r.scroll.current, o)),
      s = n.frame ? kn(n, ge(n.frame.scroll.current, o)) : n,
      u = t.displaced,
      d = Dt({
        afterDragging: ki(u.all, i),
        destination: n,
        displacedBy: t.displacedBy,
        viewport: a.frame,
        last: u,
        forceShouldAnimate: !1,
      }),
      c = Dt({
        afterDragging: ki(u.all, i),
        destination: s,
        displacedBy: t.displacedBy,
        viewport: r.frame,
        last: u,
        forceShouldAnimate: !1,
      }),
      p = {},
      l = {},
      g = [u, d, c];
    u.all.forEach(function (y) {
      var D = Zc(y, g);
      if (D) {
        l[y] = D;
        return;
      }
      p[y] = !0;
    });
    var h = Q({}, t, { displaced: { all: u.all, invisible: p, visible: l } });
    return h;
  },
  tu = function (e, t) {
    return ge(e.scroll.diff.displacement, t);
  },
  Bn = function (e) {
    var t = e.pageBorderBoxCenter,
      r = e.draggable,
      n = e.viewport,
      i = tu(n, t),
      o = ye(i, r.page.borderBox.center);
    return ge(r.client.borderBox.center, o);
  },
  Yo = function (e) {
    var t = e.draggable,
      r = e.destination,
      n = e.newPageBorderBoxCenter,
      i = e.viewport,
      o = e.withDroppableDisplacement,
      a = e.onlyOnMainAxis,
      s = a === void 0 ? !1 : a,
      u = ye(n, t.page.borderBox.center),
      d = qt(t.page.borderBox, u),
      c = {
        target: d,
        destination: r,
        withDroppableDisplacement: o,
        viewport: i,
      };
    return s ? qc(c) : zo(c);
  },
  ru = function (e) {
    var t = e.isMovingForward,
      r = e.draggable,
      n = e.destination,
      i = e.draggables,
      o = e.previousImpact,
      a = e.viewport,
      s = e.previousPageBorderBoxCenter,
      u = e.previousClientSelection,
      d = e.afterCritical;
    if (!n.isEnabled) return null;
    var c = ct(n.descriptor.id, i),
      p = ut(r, n),
      l =
        Ac({
          isMovingForward: t,
          draggable: r,
          destination: n,
          insideDestination: c,
          previousImpact: o,
        }) ||
        Hc({
          isMovingForward: t,
          isInHomeList: p,
          draggable: r,
          draggables: i,
          destination: n,
          insideDestination: c,
          previousImpact: o,
          viewport: a,
          afterCritical: d,
        });
    if (!l) return null;
    var g = Ar({
        impact: l,
        draggable: r,
        droppable: n,
        draggables: i,
        afterCritical: d,
      }),
      h = Yo({
        draggable: r,
        destination: n,
        newPageBorderBoxCenter: g,
        viewport: a.frame,
        withDroppableDisplacement: !1,
        onlyOnMainAxis: !0,
      });
    if (h) {
      var y = Bn({ pageBorderBoxCenter: g, draggable: r, viewport: a });
      return { clientSelection: y, impact: l, scrollJumpRequest: null };
    }
    var D = ye(g, s),
      C = eu({
        impact: l,
        viewport: a,
        destination: n,
        draggables: i,
        maxScrollChange: D,
      });
    return { clientSelection: u, impact: C, scrollJumpRequest: D };
  },
  me = function (t) {
    var r = t.subject.active;
    return (r || U(!1), r);
  },
  nu = function (e) {
    var t = e.isMovingForward,
      r = e.pageBorderBoxCenter,
      n = e.source,
      i = e.droppables,
      o = e.viewport,
      a = n.subject.active;
    if (!a) return null;
    var s = n.axis,
      u = De(a[s.start], a[s.end]),
      d = Pr(i)
        .filter(function (p) {
          return p !== n;
        })
        .filter(function (p) {
          return p.isEnabled;
        })
        .filter(function (p) {
          return Boolean(p.subject.active);
        })
        .filter(function (p) {
          return Vo(o.frame)(me(p));
        })
        .filter(function (p) {
          var l = me(p);
          return t
            ? a[s.crossAxisEnd] < l[s.crossAxisEnd]
            : l[s.crossAxisStart] < a[s.crossAxisStart];
        })
        .filter(function (p) {
          var l = me(p),
            g = De(l[s.start], l[s.end]);
          return u(l[s.start]) || u(l[s.end]) || g(a[s.start]) || g(a[s.end]);
        })
        .sort(function (p, l) {
          var g = me(p)[s.crossAxisStart],
            h = me(l)[s.crossAxisStart];
          return t ? g - h : h - g;
        })
        .filter(function (p, l, g) {
          return me(p)[s.crossAxisStart] === me(g[0])[s.crossAxisStart];
        });
    if (!d.length) return null;
    if (d.length === 1) return d[0];
    var c = d.filter(function (p) {
      var l = De(me(p)[s.start], me(p)[s.end]);
      return l(r[s.line]);
    });
    return c.length === 1
      ? c[0]
      : c.length > 1
        ? c.sort(function (p, l) {
            return me(p)[s.start] - me(l)[s.start];
          })[0]
        : d.sort(function (p, l) {
            var g = Ei(r, Di(me(p))),
              h = Ei(r, Di(me(l)));
            return g !== h ? g - h : me(p)[s.start] - me(l)[s.start];
          })[0];
  },
  Mi = function (t, r) {
    var n = t.page.borderBox.center;
    return je(t.descriptor.id, r) ? ye(n, r.displacedBy.point) : n;
  },
  iu = function (t, r) {
    var n = t.page.borderBox;
    return je(t.descriptor.id, r) ? qt(n, lt(r.displacedBy.point)) : n;
  },
  ou = function (e) {
    var t = e.pageBorderBoxCenter,
      r = e.viewport,
      n = e.destination,
      i = e.insideDestination,
      o = e.afterCritical,
      a = i
        .filter(function (s) {
          return zo({
            target: iu(s, o),
            destination: n,
            viewport: r.frame,
            withDroppableDisplacement: !0,
          });
        })
        .sort(function (s, u) {
          var d = Ct(t, dn(n, Mi(s, o))),
            c = Ct(t, dn(n, Mi(u, o)));
          return d < c
            ? -1
            : c < d
              ? 1
              : s.descriptor.index - u.descriptor.index;
        });
    return a[0] || null;
  },
  $t = ue(function (t, r) {
    var n = r[t.line];
    return { value: n, point: Xe(t.line, n) };
  }),
  au = function (t, r, n) {
    var i = t.axis;
    if (t.descriptor.mode === "virtual") return Xe(i.line, r[i.line]);
    var o = t.subject.page.contentBox[i.size],
      a = ct(t.descriptor.id, n),
      s = a.reduce(function (c, p) {
        return c + p.client.marginBox[i.size];
      }, 0),
      u = s + r[i.line],
      d = u - o;
    return d <= 0 ? null : Xe(i.line, d);
  },
  Qo = function (t, r) {
    return Q({}, t, { scroll: Q({}, t.scroll, { max: r }) });
  },
  Xo = function (t, r, n) {
    var i = t.frame;
    (ut(r, t) && U(!1), t.subject.withPlaceholder && U(!1));
    var o = $t(t.axis, r.displaceBy).point,
      a = au(t, o, n),
      s = {
        placeholderSize: o,
        increasedBy: a,
        oldFrameMaxScroll: t.frame ? t.frame.scroll.max : null,
      };
    if (!i) {
      var u = ot({
        page: t.subject.page,
        withPlaceholder: s,
        axis: t.axis,
        frame: t.frame,
      });
      return Q({}, t, { subject: u });
    }
    var d = a ? ge(i.scroll.max, a) : i.scroll.max,
      c = Qo(i, d),
      p = ot({
        page: t.subject.page,
        withPlaceholder: s,
        axis: t.axis,
        frame: c,
      });
    return Q({}, t, { subject: p, frame: c });
  },
  su = function (t) {
    var r = t.subject.withPlaceholder;
    r || U(!1);
    var n = t.frame;
    if (!n) {
      var i = ot({
        page: t.subject.page,
        axis: t.axis,
        frame: null,
        withPlaceholder: null,
      });
      return Q({}, t, { subject: i });
    }
    var o = r.oldFrameMaxScroll;
    o || U(!1);
    var a = Qo(n, o),
      s = ot({
        page: t.subject.page,
        axis: t.axis,
        frame: a,
        withPlaceholder: null,
      });
    return Q({}, t, { subject: s, frame: a });
  },
  lu = function (e) {
    var t = e.previousPageBorderBoxCenter,
      r = e.moveRelativeTo,
      n = e.insideDestination,
      i = e.draggable,
      o = e.draggables,
      a = e.destination,
      s = e.viewport,
      u = e.afterCritical;
    if (!r) {
      if (n.length) return null;
      var d = {
          displaced: Et,
          displacedBy: Wo,
          at: {
            type: "REORDER",
            destination: { droppableId: a.descriptor.id, index: 0 },
          },
        },
        c = Ar({
          impact: d,
          draggable: i,
          droppable: a,
          draggables: o,
          afterCritical: u,
        }),
        p = ut(i, a) ? a : Xo(a, i, o),
        l = Yo({
          draggable: i,
          destination: p,
          newPageBorderBoxCenter: c,
          viewport: s.frame,
          withDroppableDisplacement: !1,
          onlyOnMainAxis: !0,
        });
      return l ? d : null;
    }
    var g = Boolean(t[a.axis.line] <= r.page.borderBox.center[a.axis.line]),
      h = (function () {
        var D = r.descriptor.index;
        return r.descriptor.id === i.descriptor.id || g ? D : D + 1;
      })(),
      y = $t(a.axis, i.displaceBy);
    return ur({
      draggable: i,
      insideDestination: n,
      destination: a,
      viewport: s,
      displacedBy: y,
      last: Et,
      index: h,
    });
  },
  cu = function (e) {
    var t = e.isMovingForward,
      r = e.previousPageBorderBoxCenter,
      n = e.draggable,
      i = e.isOver,
      o = e.draggables,
      a = e.droppables,
      s = e.viewport,
      u = e.afterCritical,
      d = nu({
        isMovingForward: t,
        pageBorderBoxCenter: r,
        source: i,
        droppables: a,
        viewport: s,
      });
    if (!d) return null;
    var c = ct(d.descriptor.id, o),
      p = ou({
        pageBorderBoxCenter: r,
        viewport: s,
        destination: d,
        insideDestination: c,
        afterCritical: u,
      }),
      l = lu({
        previousPageBorderBoxCenter: r,
        destination: d,
        draggable: n,
        draggables: o,
        moveRelativeTo: p,
        insideDestination: c,
        viewport: s,
        afterCritical: u,
      });
    if (!l) return null;
    var g = Ar({
        impact: l,
        draggable: n,
        droppable: d,
        draggables: o,
        afterCritical: u,
      }),
      h = Bn({ pageBorderBoxCenter: g, draggable: n, viewport: s });
    return { clientSelection: h, impact: l, scrollJumpRequest: null };
  },
  we = function (e) {
    var t = e.at;
    return t
      ? t.type === "REORDER"
        ? t.destination.droppableId
        : t.combine.droppableId
      : null;
  },
  uu = function (t, r) {
    var n = we(t);
    return n ? r[n] : null;
  },
  du = function (e) {
    var t = e.state,
      r = e.type,
      n = uu(t.impact, t.dimensions.droppables),
      i = Boolean(n),
      o = t.dimensions.droppables[t.critical.droppable.id],
      a = n || o,
      s = a.axis.direction,
      u =
        (s === "vertical" && (r === "MOVE_UP" || r === "MOVE_DOWN")) ||
        (s === "horizontal" && (r === "MOVE_LEFT" || r === "MOVE_RIGHT"));
    if (u && !i) return null;
    var d = r === "MOVE_DOWN" || r === "MOVE_RIGHT",
      c = t.dimensions.draggables[t.critical.draggable.id],
      p = t.current.page.borderBoxCenter,
      l = t.dimensions,
      g = l.draggables,
      h = l.droppables;
    return u
      ? ru({
          isMovingForward: d,
          previousPageBorderBoxCenter: p,
          draggable: c,
          destination: a,
          draggables: g,
          viewport: t.viewport,
          previousClientSelection: t.current.client.selection,
          previousImpact: t.impact,
          afterCritical: t.afterCritical,
        })
      : cu({
          isMovingForward: d,
          previousPageBorderBoxCenter: p,
          draggable: c,
          isOver: a,
          draggables: g,
          droppables: h,
          viewport: t.viewport,
          afterCritical: t.afterCritical,
        });
  };
function Qe(e) {
  return e.phase === "DRAGGING" || e.phase === "COLLECTING";
}
function Zo(e) {
  var t = De(e.top, e.bottom),
    r = De(e.left, e.right);
  return function (i) {
    return t(i.y) && r(i.x);
  };
}
function pu(e, t) {
  return (
    e.left < t.right && e.right > t.left && e.top < t.bottom && e.bottom > t.top
  );
}
function fu(e) {
  var t = e.pageBorderBox,
    r = e.draggable,
    n = e.candidates,
    i = r.page.borderBox.center,
    o = n
      .map(function (a) {
        var s = a.axis,
          u = Xe(
            a.axis.line,
            t.center[s.line],
            a.page.borderBox.center[s.crossAxisLine],
          );
        return { id: a.descriptor.id, distance: Ct(i, u) };
      })
      .sort(function (a, s) {
        return s.distance - a.distance;
      });
  return o[0] ? o[0].id : null;
}
function gu(e) {
  var t = e.pageBorderBox,
    r = e.draggable,
    n = e.droppables,
    i = Pr(n).filter(function (o) {
      if (!o.isEnabled) return !1;
      var a = o.subject.active;
      if (!a || !pu(t, a)) return !1;
      if (Zo(a)(t.center)) return !0;
      var s = o.axis,
        u = a.center[s.crossAxisLine],
        d = t[s.crossAxisStart],
        c = t[s.crossAxisEnd],
        p = De(a[s.crossAxisStart], a[s.crossAxisEnd]),
        l = p(d),
        g = p(c);
      return !l && !g ? !0 : l ? d < u : c > u;
    });
  return i.length
    ? i.length === 1
      ? i[0].descriptor.id
      : fu({ pageBorderBox: t, draggable: r, candidates: i })
    : null;
}
var ea = function (t, r) {
    return Pe(qt(t, r));
  },
  mu = function (e, t) {
    var r = e.frame;
    return r ? ea(t, r.scroll.diff.value) : t;
  };
function ta(e) {
  var t = e.displaced,
    r = e.id;
  return Boolean(t.visible[r] || t.invisible[r]);
}
function vu(e) {
  var t = e.draggable,
    r = e.closest,
    n = e.inHomeList;
  return r
    ? n && r.descriptor.index > t.descriptor.index
      ? r.descriptor.index - 1
      : r.descriptor.index
    : null;
}
var hu = function (e) {
    var t = e.pageBorderBoxWithDroppableScroll,
      r = e.draggable,
      n = e.destination,
      i = e.insideDestination,
      o = e.last,
      a = e.viewport,
      s = e.afterCritical,
      u = n.axis,
      d = $t(n.axis, r.displaceBy),
      c = d.value,
      p = t[u.start],
      l = t[u.end],
      g = Mr(r, i),
      h = Ve(g, function (D) {
        var C = D.descriptor.id,
          w = D.page.borderBox.center[u.line],
          P = je(C, s),
          _ = ta({ displaced: o, id: C });
        return P ? (_ ? l <= w : p < w - c) : _ ? l <= w + c : p < w;
      }),
      y = vu({ draggable: r, closest: h, inHomeList: ut(r, n) });
    return ur({
      draggable: r,
      insideDestination: i,
      destination: n,
      viewport: a,
      last: o,
      displacedBy: d,
      index: y,
    });
  },
  bu = 4,
  yu = function (e) {
    var t = e.draggable,
      r = e.pageBorderBoxWithDroppableScroll,
      n = e.previousImpact,
      i = e.destination,
      o = e.insideDestination,
      a = e.afterCritical;
    if (!i.isCombineEnabled) return null;
    var s = i.axis,
      u = $t(i.axis, t.displaceBy),
      d = u.value,
      c = r[s.start],
      p = r[s.end],
      l = Mr(t, o),
      g = Ve(l, function (y) {
        var D = y.descriptor.id,
          C = y.page.borderBox,
          w = C[s.size],
          P = w / bu,
          _ = je(D, a),
          N = ta({ displaced: n.displaced, id: D });
        return _
          ? N
            ? p > C[s.start] + P && p < C[s.end] - P
            : c > C[s.start] - d + P && c < C[s.end] - d - P
          : N
            ? p > C[s.start] + d + P && p < C[s.end] + d - P
            : c > C[s.start] + P && c < C[s.end] - P;
      });
    if (!g) return null;
    var h = {
      displacedBy: u,
      displaced: n.displaced,
      at: {
        type: "COMBINE",
        combine: { draggableId: g.descriptor.id, droppableId: i.descriptor.id },
      },
    };
    return h;
  },
  ra = function (e) {
    var t = e.pageOffset,
      r = e.draggable,
      n = e.draggables,
      i = e.droppables,
      o = e.previousImpact,
      a = e.viewport,
      s = e.afterCritical,
      u = ea(r.page.borderBox, t),
      d = gu({ pageBorderBox: u, draggable: r, droppables: i });
    if (!d) return Oc;
    var c = i[d],
      p = ct(c.descriptor.id, n),
      l = mu(c, u);
    return (
      yu({
        pageBorderBoxWithDroppableScroll: l,
        draggable: r,
        previousImpact: o,
        destination: c,
        insideDestination: p,
        afterCritical: s,
      }) ||
      hu({
        pageBorderBoxWithDroppableScroll: l,
        draggable: r,
        destination: c,
        insideDestination: p,
        last: o.displaced,
        viewport: a,
        afterCritical: s,
      })
    );
  },
  Ln = function (e, t) {
    var r;
    return Q({}, e, ((r = {}), (r[t.descriptor.id] = t), r));
  },
  wu = function (t) {
    var r = t.previousImpact,
      n = t.impact,
      i = t.droppables,
      o = we(r),
      a = we(n);
    if (!o || o === a) return i;
    var s = i[o];
    if (!s.subject.withPlaceholder) return i;
    var u = su(s);
    return Ln(i, u);
  },
  xu = function (e) {
    var t = e.draggable,
      r = e.draggables,
      n = e.droppables,
      i = e.previousImpact,
      o = e.impact,
      a = wu({ previousImpact: i, impact: o, droppables: n }),
      s = we(o);
    if (!s) return a;
    var u = n[s];
    if (ut(t, u) || u.subject.withPlaceholder) return a;
    var d = Xo(u, t, r);
    return Ln(a, d);
  },
  yt = function (e) {
    var t = e.state,
      r = e.clientSelection,
      n = e.dimensions,
      i = e.viewport,
      o = e.impact,
      a = e.scrollJumpRequest,
      s = i || t.viewport,
      u = n || t.dimensions,
      d = r || t.current.client.selection,
      c = ye(d, t.initial.client.selection),
      p = {
        offset: c,
        selection: d,
        borderBoxCenter: ge(t.initial.client.borderBoxCenter, c),
      },
      l = {
        selection: ge(p.selection, s.scroll.current),
        borderBoxCenter: ge(p.borderBoxCenter, s.scroll.current),
        offset: ge(p.offset, s.scroll.diff.value),
      },
      g = { client: p, page: l };
    if (t.phase === "COLLECTING")
      return Q({ phase: "COLLECTING" }, t, {
        dimensions: u,
        viewport: s,
        current: g,
      });
    var h = u.draggables[t.critical.draggable.id],
      y =
        o ||
        ra({
          pageOffset: l.offset,
          draggable: h,
          draggables: u.draggables,
          droppables: u.droppables,
          previousImpact: t.impact,
          viewport: s,
          afterCritical: t.afterCritical,
        }),
      D = xu({
        draggable: h,
        impact: y,
        previousImpact: t.impact,
        draggables: u.draggables,
        droppables: u.droppables,
      }),
      C = Q({}, t, {
        current: g,
        dimensions: { draggables: u.draggables, droppables: D },
        impact: y,
        viewport: s,
        scrollJumpRequest: a || null,
        forceShouldAnimate: a ? !1 : null,
      });
    return C;
  };
function Iu(e, t) {
  return e.map(function (r) {
    return t[r];
  });
}
var na = function (e) {
    var t = e.impact,
      r = e.viewport,
      n = e.draggables,
      i = e.destination,
      o = e.forceShouldAnimate,
      a = t.displaced,
      s = Iu(a.all, n),
      u = Dt({
        afterDragging: s,
        destination: i,
        displacedBy: t.displacedBy,
        viewport: r.frame,
        forceShouldAnimate: o,
        last: a,
      });
    return Q({}, t, { displaced: u });
  },
  ia = function (e) {
    var t = e.impact,
      r = e.draggable,
      n = e.droppable,
      i = e.draggables,
      o = e.viewport,
      a = e.afterCritical,
      s = Ar({
        impact: t,
        draggable: r,
        draggables: i,
        droppable: n,
        afterCritical: a,
      });
    return Bn({ pageBorderBoxCenter: s, draggable: r, viewport: o });
  },
  oa = function (e) {
    var t = e.state,
      r = e.dimensions,
      n = e.viewport;
    t.movementMode !== "SNAP" && U(!1);
    var i = t.impact,
      o = n || t.viewport,
      a = r || t.dimensions,
      s = a.draggables,
      u = a.droppables,
      d = s[t.critical.draggable.id],
      c = we(i);
    c || U(!1);
    var p = u[c],
      l = na({ impact: i, viewport: o, destination: p, draggables: s }),
      g = ia({
        impact: l,
        draggable: d,
        droppable: p,
        draggables: s,
        viewport: o,
        afterCritical: t.afterCritical,
      });
    return yt({
      impact: l,
      clientSelection: g,
      state: t,
      dimensions: a,
      viewport: o,
    });
  },
  Su = function (e) {
    return { index: e.index, droppableId: e.droppableId };
  },
  aa = function (e) {
    var t = e.draggable,
      r = e.home,
      n = e.draggables,
      i = e.viewport,
      o = $t(r.axis, t.displaceBy),
      a = ct(r.descriptor.id, n),
      s = a.indexOf(t);
    s === -1 && U(!1);
    var u = a.slice(s + 1),
      d = u.reduce(function (g, h) {
        return ((g[h.descriptor.id] = !0), g);
      }, {}),
      c = {
        inVirtualList: r.descriptor.mode === "virtual",
        displacedBy: o,
        effected: d,
      },
      p = Dt({
        afterDragging: u,
        destination: r,
        displacedBy: o,
        last: null,
        viewport: i.frame,
        forceShouldAnimate: !1,
      }),
      l = {
        displaced: p,
        displacedBy: o,
        at: { type: "REORDER", destination: Su(t.descriptor) },
      };
    return { impact: l, afterCritical: c };
  },
  Cu = function (e, t) {
    return { draggables: e.draggables, droppables: Ln(e.droppables, t) };
  },
  Eu = function (e) {
    var t = e.draggable,
      r = e.offset,
      n = e.initialWindowScroll,
      i = or(t.client, r),
      o = ar(i, n),
      a = Q({}, t, {
        placeholder: Q({}, t.placeholder, { client: i }),
        client: i,
        page: o,
      });
    return a;
  },
  Du = function (e) {
    var t = e.frame;
    return (t || U(!1), t);
  },
  _u = function (e) {
    var t = e.additions,
      r = e.updatedDroppables,
      n = e.viewport,
      i = n.scroll.diff.value;
    return t.map(function (o) {
      var a = o.descriptor.droppableId,
        s = r[a],
        u = Du(s),
        d = u.scroll.diff.value,
        c = ge(i, d),
        p = Eu({
          draggable: o,
          offset: c,
          initialWindowScroll: n.scroll.initial,
        });
      return p;
    });
  },
  Nu = function (e) {
    var t = e.state,
      r = e.published,
      n = r.modified.map(function (P) {
        var _ = t.dimensions.droppables[P.droppableId],
          N = kn(_, P.scroll);
        return N;
      }),
      i = Q({}, t.dimensions.droppables, {}, Go(n)),
      o = jo(
        _u({
          additions: r.additions,
          updatedDroppables: i,
          viewport: t.viewport,
        }),
      ),
      a = Q({}, t.dimensions.draggables, {}, o);
    r.removals.forEach(function (P) {
      delete a[P];
    });
    var s = { droppables: i, draggables: a },
      u = we(t.impact),
      d = u ? s.droppables[u] : null,
      c = s.draggables[t.critical.draggable.id],
      p = s.droppables[t.critical.droppable.id],
      l = aa({ draggable: c, home: p, draggables: a, viewport: t.viewport }),
      g = l.impact,
      h = l.afterCritical,
      y = d && d.isCombineEnabled ? t.impact : g,
      D = ra({
        pageOffset: t.current.page.offset,
        draggable: s.draggables[t.critical.draggable.id],
        draggables: s.draggables,
        droppables: s.droppables,
        previousImpact: y,
        viewport: t.viewport,
        afterCritical: h,
      }),
      C = Q({ phase: "DRAGGING" }, t, {
        phase: "DRAGGING",
        impact: D,
        onLiftImpact: g,
        dimensions: s,
        afterCritical: h,
        forceShouldAnimate: !1,
      });
    if (t.phase === "COLLECTING") return C;
    var w = Q({ phase: "DROP_PENDING" }, C, {
      phase: "DROP_PENDING",
      reason: t.reason,
      isWaiting: !1,
    });
    return w;
  },
  pn = function (t) {
    return t.movementMode === "SNAP";
  },
  Vr = function (t, r, n) {
    var i = Cu(t.dimensions, r);
    return !pn(t) || n
      ? yt({ state: t, dimensions: i })
      : oa({ state: t, dimensions: i });
  };
function Hr(e) {
  return e.isDragging && e.movementMode === "SNAP"
    ? Q({ phase: "DRAGGING" }, e, { scrollJumpRequest: null })
    : e;
}
var Ai = { phase: "IDLE", completed: null, shouldFlush: !1 },
  Pu = function (e, t) {
    if ((e === void 0 && (e = Ai), t.type === "FLUSH"))
      return Q({}, Ai, { shouldFlush: !0 });
    if (t.type === "INITIAL_PUBLISH") {
      e.phase !== "IDLE" && U(!1);
      var r = t.payload,
        n = r.critical,
        i = r.clientSelection,
        o = r.viewport,
        a = r.dimensions,
        s = r.movementMode,
        u = a.draggables[n.draggable.id],
        d = a.droppables[n.droppable.id],
        c = {
          selection: i,
          borderBoxCenter: u.client.borderBox.center,
          offset: de,
        },
        p = {
          client: c,
          page: {
            selection: ge(c.selection, o.scroll.initial),
            borderBoxCenter: ge(c.selection, o.scroll.initial),
            offset: ge(c.selection, o.scroll.diff.value),
          },
        },
        l = Pr(a.droppables).every(function (ze) {
          return !ze.isFixedOnPage;
        }),
        g = aa({
          draggable: u,
          home: d,
          draggables: a.draggables,
          viewport: o,
        }),
        h = g.impact,
        y = g.afterCritical,
        D = {
          phase: "DRAGGING",
          isDragging: !0,
          critical: n,
          movementMode: s,
          dimensions: a,
          initial: p,
          current: p,
          isWindowScrollAllowed: l,
          impact: h,
          afterCritical: y,
          onLiftImpact: h,
          viewport: o,
          scrollJumpRequest: null,
          forceShouldAnimate: null,
        };
      return D;
    }
    if (t.type === "COLLECTION_STARTING") {
      if (e.phase === "COLLECTING" || e.phase === "DROP_PENDING") return e;
      e.phase !== "DRAGGING" && U(!1);
      var C = Q({ phase: "COLLECTING" }, e, { phase: "COLLECTING" });
      return C;
    }
    if (t.type === "PUBLISH_WHILE_DRAGGING")
      return (
        e.phase === "COLLECTING" || e.phase === "DROP_PENDING" || U(!1),
        Nu({ state: e, published: t.payload })
      );
    if (t.type === "MOVE") {
      if (e.phase === "DROP_PENDING") return e;
      Qe(e) || U(!1);
      var w = t.payload.client;
      return $e(w, e.current.client.selection)
        ? e
        : yt({ state: e, clientSelection: w, impact: pn(e) ? e.impact : null });
    }
    if (t.type === "UPDATE_DROPPABLE_SCROLL") {
      if (e.phase === "DROP_PENDING" || e.phase === "COLLECTING") return Hr(e);
      Qe(e) || U(!1);
      var P = t.payload,
        _ = P.id,
        N = P.newScroll,
        B = e.dimensions.droppables[_];
      if (!B) return e;
      var W = kn(B, N);
      return Vr(e, W, !1);
    }
    if (t.type === "UPDATE_DROPPABLE_IS_ENABLED") {
      if (e.phase === "DROP_PENDING") return e;
      Qe(e) || U(!1);
      var X = t.payload,
        V = X.id,
        k = X.isEnabled,
        O = e.dimensions.droppables[V];
      (O || U(!1), O.isEnabled === k && U(!1));
      var q = Q({}, O, { isEnabled: k });
      return Vr(e, q, !0);
    }
    if (t.type === "UPDATE_DROPPABLE_IS_COMBINE_ENABLED") {
      if (e.phase === "DROP_PENDING") return e;
      Qe(e) || U(!1);
      var m = t.payload,
        v = m.id,
        b = m.isCombineEnabled,
        E = e.dimensions.droppables[v];
      (E || U(!1), E.isCombineEnabled === b && U(!1));
      var R = Q({}, E, { isCombineEnabled: b });
      return Vr(e, R, !0);
    }
    if (t.type === "MOVE_BY_WINDOW_SCROLL") {
      if (e.phase === "DROP_PENDING" || e.phase === "DROP_ANIMATING") return e;
      (Qe(e) || U(!1), e.isWindowScrollAllowed || U(!1));
      var T = t.payload.newScroll;
      if ($e(e.viewport.scroll.current, T)) return Hr(e);
      var L = Jo(e.viewport, T);
      return pn(e)
        ? oa({ state: e, viewport: L })
        : yt({ state: e, viewport: L });
    }
    if (t.type === "UPDATE_VIEWPORT_MAX_SCROLL") {
      if (!Qe(e)) return e;
      var j = t.payload.maxScroll;
      if ($e(j, e.viewport.scroll.max)) return e;
      var $ = Q({}, e.viewport, {
        scroll: Q({}, e.viewport.scroll, { max: j }),
      });
      return Q({ phase: "DRAGGING" }, e, { viewport: $ });
    }
    if (
      t.type === "MOVE_UP" ||
      t.type === "MOVE_DOWN" ||
      t.type === "MOVE_LEFT" ||
      t.type === "MOVE_RIGHT"
    ) {
      if (e.phase === "COLLECTING" || e.phase === "DROP_PENDING") return e;
      e.phase !== "DRAGGING" && U(!1);
      var K = du({ state: e, type: t.type });
      return K
        ? yt({
            state: e,
            impact: K.impact,
            clientSelection: K.clientSelection,
            scrollJumpRequest: K.scrollJumpRequest,
          })
        : e;
    }
    if (t.type === "DROP_PENDING") {
      var G = t.payload.reason;
      e.phase !== "COLLECTING" && U(!1);
      var A = Q({ phase: "DROP_PENDING" }, e, {
        phase: "DROP_PENDING",
        isWaiting: !0,
        reason: G,
      });
      return A;
    }
    if (t.type === "DROP_ANIMATE") {
      var J = t.payload,
        Z = J.completed,
        le = J.dropDuration,
        ee = J.newHomeClientOffset;
      e.phase === "DRAGGING" || e.phase === "DROP_PENDING" || U(!1);
      var _e = {
        phase: "DROP_ANIMATING",
        completed: Z,
        dropDuration: le,
        newHomeClientOffset: ee,
        dimensions: e.dimensions,
      };
      return _e;
    }
    if (t.type === "DROP_COMPLETE") {
      var Oe = t.payload.completed;
      return { phase: "IDLE", completed: Oe, shouldFlush: !1 };
    }
    return e;
  },
  ku = function (t) {
    return { type: "BEFORE_INITIAL_CAPTURE", payload: t };
  },
  Mu = function (t) {
    return { type: "LIFT", payload: t };
  },
  Au = function (t) {
    return { type: "INITIAL_PUBLISH", payload: t };
  },
  Ou = function (t) {
    return { type: "PUBLISH_WHILE_DRAGGING", payload: t };
  },
  Ru = function () {
    return { type: "COLLECTION_STARTING", payload: null };
  },
  Tu = function (t) {
    return { type: "UPDATE_DROPPABLE_SCROLL", payload: t };
  },
  Bu = function (t) {
    return { type: "UPDATE_DROPPABLE_IS_ENABLED", payload: t };
  },
  Lu = function (t) {
    return { type: "UPDATE_DROPPABLE_IS_COMBINE_ENABLED", payload: t };
  },
  sa = function (t) {
    return { type: "MOVE", payload: t };
  },
  Fu = function (t) {
    return { type: "MOVE_BY_WINDOW_SCROLL", payload: t };
  },
  Uu = function (t) {
    return { type: "UPDATE_VIEWPORT_MAX_SCROLL", payload: t };
  },
  qu = function () {
    return { type: "MOVE_UP", payload: null };
  },
  $u = function () {
    return { type: "MOVE_DOWN", payload: null };
  },
  Gu = function () {
    return { type: "MOVE_RIGHT", payload: null };
  },
  ju = function () {
    return { type: "MOVE_LEFT", payload: null };
  },
  Fn = function () {
    return { type: "FLUSH", payload: null };
  },
  Wu = function (t) {
    return { type: "DROP_ANIMATE", payload: t };
  },
  Un = function (t) {
    return { type: "DROP_COMPLETE", payload: t };
  },
  la = function (t) {
    return { type: "DROP", payload: t };
  },
  Vu = function (t) {
    return { type: "DROP_PENDING", payload: t };
  },
  ca = function () {
    return { type: "DROP_ANIMATION_FINISHED", payload: null };
  },
  Hu = function (e) {
    return function (t) {
      var r = t.getState,
        n = t.dispatch;
      return function (i) {
        return function (o) {
          if (o.type !== "LIFT") {
            i(o);
            return;
          }
          var a = o.payload,
            s = a.id,
            u = a.clientSelection,
            d = a.movementMode,
            c = r();
          (c.phase === "DROP_ANIMATING" && n(Un({ completed: c.completed })),
            r().phase !== "IDLE" && U(!1),
            n(Fn()),
            n(ku({ draggableId: s, movementMode: d })));
          var p = { shouldPublishImmediately: d === "SNAP" },
            l = { draggableId: s, scrollOptions: p },
            g = e.startPublishing(l),
            h = g.critical,
            y = g.dimensions,
            D = g.viewport;
          n(
            Au({
              critical: h,
              dimensions: y,
              clientSelection: u,
              movementMode: d,
              viewport: D,
            }),
          );
        };
      };
    };
  },
  zu = function (e) {
    return function () {
      return function (t) {
        return function (r) {
          (r.type === "INITIAL_PUBLISH" && e.dragging(),
            r.type === "DROP_ANIMATE" &&
              e.dropping(r.payload.completed.result.reason),
            (r.type === "FLUSH" || r.type === "DROP_COMPLETE") && e.resting(),
            t(r));
        };
      };
    };
  },
  qn = {
    outOfTheWay: "cubic-bezier(0.2, 0, 0, 1)",
    drop: "cubic-bezier(.2,1,.1,1)",
  },
  _t = { opacity: { drop: 0, combining: 0.7 }, scale: { drop: 0.75 } },
  $n = { outOfTheWay: 0.2, minDropTime: 0.33, maxDropTime: 0.55 },
  Ye = $n.outOfTheWay + "s " + qn.outOfTheWay,
  wt = {
    fluid: "opacity " + Ye,
    snap: "transform " + Ye + ", opacity " + Ye,
    drop: function (t) {
      var r = t + "s " + qn.drop;
      return "transform " + r + ", opacity " + r;
    },
    outOfTheWay: "transform " + Ye,
    placeholder: "height " + Ye + ", width " + Ye + ", margin " + Ye,
  },
  Oi = function (t) {
    return $e(t, de) ? null : "translate(" + t.x + "px, " + t.y + "px)";
  },
  fn = {
    moveTo: Oi,
    drop: function (t, r) {
      var n = Oi(t);
      return n ? (r ? n + " scale(" + _t.scale.drop + ")" : n) : null;
    },
  },
  gn = $n.minDropTime,
  ua = $n.maxDropTime,
  Ku = ua - gn,
  Ri = 1500,
  Ju = 0.6,
  Yu = function (e) {
    var t = e.current,
      r = e.destination,
      n = e.reason,
      i = Ct(t, r);
    if (i <= 0) return gn;
    if (i >= Ri) return ua;
    var o = i / Ri,
      a = gn + Ku * o,
      s = n === "CANCEL" ? a * Ju : a;
    return Number(s.toFixed(2));
  },
  Qu = function (e) {
    var t = e.impact,
      r = e.draggable,
      n = e.dimensions,
      i = e.viewport,
      o = e.afterCritical,
      a = n.draggables,
      s = n.droppables,
      u = we(t),
      d = u ? s[u] : null,
      c = s[r.descriptor.droppableId],
      p = ia({
        impact: t,
        draggable: r,
        draggables: a,
        afterCritical: o,
        droppable: d || c,
        viewport: i,
      }),
      l = ye(p, r.client.borderBox.center);
    return l;
  },
  Xu = function (e) {
    var t = e.draggables,
      r = e.reason,
      n = e.lastImpact,
      i = e.home,
      o = e.viewport,
      a = e.onLiftImpact;
    if (!n.at || r !== "DROP") {
      var s = na({
        draggables: t,
        impact: a,
        destination: i,
        viewport: o,
        forceShouldAnimate: !0,
      });
      return { impact: s, didDropInsideDroppable: !1 };
    }
    if (n.at.type === "REORDER")
      return { impact: n, didDropInsideDroppable: !0 };
    var u = Q({}, n, { displaced: Et });
    return { impact: u, didDropInsideDroppable: !0 };
  },
  Zu = function (e) {
    var t = e.getState,
      r = e.dispatch;
    return function (n) {
      return function (i) {
        if (i.type !== "DROP") {
          n(i);
          return;
        }
        var o = t(),
          a = i.payload.reason;
        if (o.phase === "COLLECTING") {
          r(Vu({ reason: a }));
          return;
        }
        if (o.phase !== "IDLE") {
          var s = o.phase === "DROP_PENDING" && o.isWaiting;
          (s && U(!1),
            o.phase === "DRAGGING" || o.phase === "DROP_PENDING" || U(!1));
          var u = o.critical,
            d = o.dimensions,
            c = d.draggables[o.critical.draggable.id],
            p = Xu({
              reason: a,
              lastImpact: o.impact,
              afterCritical: o.afterCritical,
              onLiftImpact: o.onLiftImpact,
              home: o.dimensions.droppables[o.critical.droppable.id],
              viewport: o.viewport,
              draggables: o.dimensions.draggables,
            }),
            l = p.impact,
            g = p.didDropInsideDroppable,
            h = g ? An(l) : null,
            y = g ? kr(l) : null,
            D = { index: u.draggable.index, droppableId: u.droppable.id },
            C = {
              draggableId: c.descriptor.id,
              type: c.descriptor.type,
              source: D,
              reason: a,
              mode: o.movementMode,
              destination: h,
              combine: y,
            },
            w = Qu({
              impact: l,
              draggable: c,
              dimensions: d,
              viewport: o.viewport,
              afterCritical: o.afterCritical,
            }),
            P = {
              critical: o.critical,
              afterCritical: o.afterCritical,
              result: C,
              impact: l,
            },
            _ = !$e(o.current.client.offset, w) || Boolean(C.combine);
          if (!_) {
            r(Un({ completed: P }));
            return;
          }
          var N = Yu({
              current: o.current.client.offset,
              destination: w,
              reason: a,
            }),
            B = { newHomeClientOffset: w, dropDuration: N, completed: P };
          r(Wu(B));
        }
      };
    };
  },
  da = function () {
    return { x: window.pageXOffset, y: window.pageYOffset };
  };
function ed(e) {
  return {
    eventName: "scroll",
    options: { passive: !0, capture: !1 },
    fn: function (r) {
      (r.target !== window && r.target !== window.document) || e();
    },
  };
}
function td(e) {
  var t = e.onWindowScroll;
  function r() {
    t(da());
  }
  var n = St(r),
    i = ed(n),
    o = qe;
  function a() {
    return o !== qe;
  }
  function s() {
    (a() && U(!1), (o = Ee(window, [i])));
  }
  function u() {
    (a() || U(!1), n.cancel(), o(), (o = qe));
  }
  return { start: s, stop: u, isActive: a };
}
var rd = function (t) {
    return (
      t.type === "DROP_COMPLETE" ||
      t.type === "DROP_ANIMATE" ||
      t.type === "FLUSH"
    );
  },
  nd = function (e) {
    var t = td({
      onWindowScroll: function (n) {
        e.dispatch(Fu({ newScroll: n }));
      },
    });
    return function (r) {
      return function (n) {
        (!t.isActive() && n.type === "INITIAL_PUBLISH" && t.start(),
          t.isActive() && rd(n) && t.stop(),
          r(n));
      };
    };
  },
  id = function (e) {
    var t = !1,
      r = !1,
      n = setTimeout(function () {
        r = !0;
      }),
      i = function (a) {
        t || r || ((t = !0), e(a), clearTimeout(n));
      };
    return (
      (i.wasCalled = function () {
        return t;
      }),
      i
    );
  },
  od = function () {
    var e = [],
      t = function (o) {
        var a = Mn(e, function (d) {
          return d.timerId === o;
        });
        a === -1 && U(!1);
        var s = e.splice(a, 1),
          u = s[0];
        u.callback();
      },
      r = function (o) {
        var a = setTimeout(function () {
            return t(a);
          }),
          s = { timerId: a, callback: o };
        e.push(s);
      },
      n = function () {
        if (!!e.length) {
          var o = [].concat(e);
          ((e.length = 0),
            o.forEach(function (a) {
              (clearTimeout(a.timerId), a.callback());
            }));
        }
      };
    return { add: r, flush: n };
  },
  ad = function (t, r) {
    return t == null && r == null
      ? !0
      : t == null || r == null
        ? !1
        : t.droppableId === r.droppableId && t.index === r.index;
  },
  sd = function (t, r) {
    return t == null && r == null
      ? !0
      : t == null || r == null
        ? !1
        : t.draggableId === r.draggableId && t.droppableId === r.droppableId;
  },
  ld = function (t, r) {
    if (t === r) return !0;
    var n =
        t.draggable.id === r.draggable.id &&
        t.draggable.droppableId === r.draggable.droppableId &&
        t.draggable.type === r.draggable.type &&
        t.draggable.index === r.draggable.index,
      i =
        t.droppable.id === r.droppable.id &&
        t.droppable.type === r.droppable.type;
    return n && i;
  },
  vt = function (t, r) {
    r();
  },
  zt = function (t, r) {
    return {
      draggableId: t.draggable.id,
      type: t.droppable.type,
      source: { droppableId: t.droppable.id, index: t.draggable.index },
      mode: r,
    };
  },
  zr = function (t, r, n, i) {
    if (!t) {
      n(i(r));
      return;
    }
    var o = id(n),
      a = { announce: o };
    (t(r, a), o.wasCalled() || n(i(r)));
  },
  cd = function (e, t) {
    var r = od(),
      n = null,
      i = function (l, g) {
        (n && U(!1),
          vt("onBeforeCapture", function () {
            var h = e().onBeforeCapture;
            if (h) {
              var y = { draggableId: l, mode: g };
              h(y);
            }
          }));
      },
      o = function (l, g) {
        (n && U(!1),
          vt("onBeforeDragStart", function () {
            var h = e().onBeforeDragStart;
            h && h(zt(l, g));
          }));
      },
      a = function (l, g) {
        n && U(!1);
        var h = zt(l, g);
        ((n = {
          mode: g,
          lastCritical: l,
          lastLocation: h.source,
          lastCombine: null,
        }),
          r.add(function () {
            vt("onDragStart", function () {
              return zr(e().onDragStart, h, t, tr.onDragStart);
            });
          }));
      },
      s = function (l, g) {
        var h = An(g),
          y = kr(g);
        n || U(!1);
        var D = !ld(l, n.lastCritical);
        D && (n.lastCritical = l);
        var C = !ad(n.lastLocation, h);
        C && (n.lastLocation = h);
        var w = !sd(n.lastCombine, y);
        if ((w && (n.lastCombine = y), !(!D && !C && !w))) {
          var P = Q({}, zt(l, n.mode), { combine: y, destination: h });
          r.add(function () {
            vt("onDragUpdate", function () {
              return zr(e().onDragUpdate, P, t, tr.onDragUpdate);
            });
          });
        }
      },
      u = function () {
        (n || U(!1), r.flush());
      },
      d = function (l) {
        (n || U(!1),
          (n = null),
          vt("onDragEnd", function () {
            return zr(e().onDragEnd, l, t, tr.onDragEnd);
          }));
      },
      c = function () {
        if (!!n) {
          var l = Q({}, zt(n.lastCritical, n.mode), {
            combine: null,
            destination: null,
            reason: "CANCEL",
          });
          d(l);
        }
      };
    return {
      beforeCapture: i,
      beforeStart: o,
      start: a,
      update: s,
      flush: u,
      drop: d,
      abort: c,
    };
  },
  ud = function (e, t) {
    var r = cd(e, t);
    return function (n) {
      return function (i) {
        return function (o) {
          if (o.type === "BEFORE_INITIAL_CAPTURE") {
            r.beforeCapture(o.payload.draggableId, o.payload.movementMode);
            return;
          }
          if (o.type === "INITIAL_PUBLISH") {
            var a = o.payload.critical;
            (r.beforeStart(a, o.payload.movementMode),
              i(o),
              r.start(a, o.payload.movementMode));
            return;
          }
          if (o.type === "DROP_COMPLETE") {
            var s = o.payload.completed.result;
            (r.flush(), i(o), r.drop(s));
            return;
          }
          if ((i(o), o.type === "FLUSH")) {
            r.abort();
            return;
          }
          var u = n.getState();
          u.phase === "DRAGGING" && r.update(u.critical, u.impact);
        };
      };
    };
  },
  dd = function (e) {
    return function (t) {
      return function (r) {
        if (r.type !== "DROP_ANIMATION_FINISHED") {
          t(r);
          return;
        }
        var n = e.getState();
        (n.phase !== "DROP_ANIMATING" && U(!1),
          e.dispatch(Un({ completed: n.completed })));
      };
    };
  },
  pd = function (e) {
    var t = null,
      r = null;
    function n() {
      (r && (cancelAnimationFrame(r), (r = null)), t && (t(), (t = null)));
    }
    return function (i) {
      return function (o) {
        if (
          ((o.type === "FLUSH" ||
            o.type === "DROP_COMPLETE" ||
            o.type === "DROP_ANIMATION_FINISHED") &&
            n(),
          i(o),
          o.type === "DROP_ANIMATE")
        ) {
          var a = {
            eventName: "scroll",
            options: { capture: !0, passive: !1, once: !0 },
            fn: function () {
              var u = e.getState();
              u.phase === "DROP_ANIMATING" && e.dispatch(ca());
            },
          };
          r = requestAnimationFrame(function () {
            ((r = null), (t = Ee(window, [a])));
          });
        }
      };
    };
  },
  fd = function (e) {
    return function () {
      return function (t) {
        return function (r) {
          ((r.type === "DROP_COMPLETE" ||
            r.type === "FLUSH" ||
            r.type === "DROP_ANIMATE") &&
            e.stopPublishing(),
            t(r));
        };
      };
    };
  },
  gd = function (e) {
    var t = !1;
    return function () {
      return function (r) {
        return function (n) {
          if (n.type === "INITIAL_PUBLISH") {
            ((t = !0),
              e.tryRecordFocus(n.payload.critical.draggable.id),
              r(n),
              e.tryRestoreFocusRecorded());
            return;
          }
          if ((r(n), !!t)) {
            if (n.type === "FLUSH") {
              ((t = !1), e.tryRestoreFocusRecorded());
              return;
            }
            if (n.type === "DROP_COMPLETE") {
              t = !1;
              var i = n.payload.completed.result;
              (i.combine &&
                e.tryShiftRecord(i.draggableId, i.combine.draggableId),
                e.tryRestoreFocusRecorded());
            }
          }
        };
      };
    };
  },
  md = function (t) {
    return (
      t.type === "DROP_COMPLETE" ||
      t.type === "DROP_ANIMATE" ||
      t.type === "FLUSH"
    );
  },
  vd = function (e) {
    return function (t) {
      return function (r) {
        return function (n) {
          if (md(n)) {
            (e.stop(), r(n));
            return;
          }
          if (n.type === "INITIAL_PUBLISH") {
            r(n);
            var i = t.getState();
            (i.phase !== "DRAGGING" && U(!1), e.start(i));
            return;
          }
          (r(n), e.scroll(t.getState()));
        };
      };
    };
  },
  hd = function (e) {
    return function (t) {
      return function (r) {
        if ((t(r), r.type === "PUBLISH_WHILE_DRAGGING")) {
          var n = e.getState();
          n.phase === "DROP_PENDING" &&
            (n.isWaiting || e.dispatch(la({ reason: n.reason })));
        }
      };
    };
  },
  bd = ho,
  yd = function (e) {
    var t = e.dimensionMarshal,
      r = e.focusMarshal,
      n = e.styleMarshal,
      i = e.getResponders,
      o = e.announce,
      a = e.autoScroller;
    return vo(
      Pu,
      bd(sl(zu(n), fd(t), Hu(t), Zu, dd, pd, hd, vd(a), nd, gd(r), ud(i, o))),
    );
  },
  Kr = function () {
    return { additions: {}, removals: {}, modified: {} };
  };
function wd(e) {
  var t = e.registry,
    r = e.callbacks,
    n = Kr(),
    i = null,
    o = function () {
      i ||
        (r.collectionStarting(),
        (i = requestAnimationFrame(function () {
          i = null;
          var c = n,
            p = c.additions,
            l = c.removals,
            g = c.modified,
            h = Object.keys(p)
              .map(function (C) {
                return t.draggable.getById(C).getDimension(de);
              })
              .sort(function (C, w) {
                return C.descriptor.index - w.descriptor.index;
              }),
            y = Object.keys(g).map(function (C) {
              var w = t.droppable.getById(C),
                P = w.callbacks.getScrollWhileDragging();
              return { droppableId: C, scroll: P };
            }),
            D = { additions: h, removals: Object.keys(l), modified: y };
          ((n = Kr()), r.publish(D));
        })));
    },
    a = function (c) {
      var p = c.descriptor.id;
      ((n.additions[p] = c),
        (n.modified[c.descriptor.droppableId] = !0),
        n.removals[p] && delete n.removals[p],
        o());
    },
    s = function (c) {
      var p = c.descriptor;
      ((n.removals[p.id] = !0),
        (n.modified[p.droppableId] = !0),
        n.additions[p.id] && delete n.additions[p.id],
        o());
    },
    u = function () {
      !i || (cancelAnimationFrame(i), (i = null), (n = Kr()));
    };
  return { add: a, remove: s, stop: u };
}
var pa = function (e) {
    var t = e.scrollHeight,
      r = e.scrollWidth,
      n = e.height,
      i = e.width,
      o = ye({ x: r, y: t }, { x: i, y: n }),
      a = { x: Math.max(0, o.x), y: Math.max(0, o.y) };
    return a;
  },
  fa = function () {
    var e = document.documentElement;
    return (e || U(!1), e);
  },
  ga = function () {
    var e = fa(),
      t = pa({
        scrollHeight: e.scrollHeight,
        scrollWidth: e.scrollWidth,
        width: e.clientWidth,
        height: e.clientHeight,
      });
    return t;
  },
  xd = function () {
    var e = da(),
      t = ga(),
      r = e.y,
      n = e.x,
      i = fa(),
      o = i.clientWidth,
      a = i.clientHeight,
      s = n + o,
      u = r + a,
      d = Pe({ top: r, left: n, right: s, bottom: u }),
      c = {
        frame: d,
        scroll: {
          initial: e,
          current: e,
          max: t,
          diff: { value: de, displacement: de },
        },
      };
    return c;
  },
  Id = function (e) {
    var t = e.critical,
      r = e.scrollOptions,
      n = e.registry,
      i = xd(),
      o = i.scroll.current,
      a = t.droppable,
      s = n.droppable.getAllByType(a.type).map(function (p) {
        return p.callbacks.getDimensionAndWatchScroll(o, r);
      }),
      u = n.draggable.getAllByType(t.draggable.type).map(function (p) {
        return p.getDimension(o);
      }),
      d = { draggables: jo(u), droppables: Go(s) },
      c = { dimensions: d, critical: t, viewport: i };
    return c;
  };
function Ti(e, t, r) {
  if (r.descriptor.id === t.id || r.descriptor.type !== t.type) return !1;
  var n = e.droppable.getById(r.descriptor.droppableId);
  return n.descriptor.mode === "virtual";
}
var Sd = function (e, t) {
    var r = null,
      n = wd({
        callbacks: {
          publish: t.publishWhileDragging,
          collectionStarting: t.collectionStarting,
        },
        registry: e,
      }),
      i = function (g, h) {
        (e.droppable.exists(g) || U(!1),
          r && t.updateDroppableIsEnabled({ id: g, isEnabled: h }));
      },
      o = function (g, h) {
        !r ||
          (e.droppable.exists(g) || U(!1),
          t.updateDroppableIsCombineEnabled({ id: g, isCombineEnabled: h }));
      },
      a = function (g, h) {
        !r ||
          (e.droppable.exists(g) || U(!1),
          t.updateDroppableScroll({ id: g, newScroll: h }));
      },
      s = function (g, h) {
        !r || e.droppable.getById(g).callbacks.scroll(h);
      },
      u = function () {
        if (!!r) {
          n.stop();
          var g = r.critical.droppable;
          (e.droppable.getAllByType(g.type).forEach(function (h) {
            return h.callbacks.dragStopped();
          }),
            r.unsubscribe(),
            (r = null));
        }
      },
      d = function (g) {
        r || U(!1);
        var h = r.critical.draggable;
        (g.type === "ADDITION" && Ti(e, h, g.value) && n.add(g.value),
          g.type === "REMOVAL" && Ti(e, h, g.value) && n.remove(g.value));
      },
      c = function (g) {
        r && U(!1);
        var h = e.draggable.getById(g.draggableId),
          y = e.droppable.getById(h.descriptor.droppableId),
          D = { draggable: h.descriptor, droppable: y.descriptor },
          C = e.subscribe(d);
        return (
          (r = { critical: D, unsubscribe: C }),
          Id({ critical: D, registry: e, scrollOptions: g.scrollOptions })
        );
      },
      p = {
        updateDroppableIsEnabled: i,
        updateDroppableIsCombineEnabled: o,
        scrollDroppable: s,
        updateDroppableScroll: a,
        startPublishing: c,
        stopPublishing: u,
      };
    return p;
  },
  ma = function (e, t) {
    return e.phase === "IDLE"
      ? !0
      : e.phase !== "DROP_ANIMATING" || e.completed.result.draggableId === t
        ? !1
        : e.completed.result.reason === "DROP";
  },
  Cd = function (e) {
    window.scrollBy(e.x, e.y);
  },
  Ed = ue(function (e) {
    return Pr(e).filter(function (t) {
      return !(!t.isEnabled || !t.frame);
    });
  }),
  Dd = function (t, r) {
    var n = Ve(Ed(r), function (i) {
      return (i.frame || U(!1), Zo(i.frame.pageMarginBox)(t));
    });
    return n;
  },
  _d = function (e) {
    var t = e.center,
      r = e.destination,
      n = e.droppables;
    if (r) {
      var i = n[r];
      return i.frame ? i : null;
    }
    var o = Dd(t, n);
    return o;
  },
  Ge = {
    startFromPercentage: 0.25,
    maxScrollAtPercentage: 0.05,
    maxPixelScroll: 28,
    ease: function (t) {
      return Math.pow(t, 2);
    },
    durationDampening: { stopDampeningAt: 1200, accelerateAt: 360 },
  },
  Nd = function (e, t) {
    var r = e[t.size] * Ge.startFromPercentage,
      n = e[t.size] * Ge.maxScrollAtPercentage,
      i = { startScrollingFrom: r, maxScrollValueAt: n };
    return i;
  },
  va = function (e) {
    var t = e.startOfRange,
      r = e.endOfRange,
      n = e.current,
      i = r - t;
    if (i === 0) return 0;
    var o = n - t,
      a = o / i;
    return a;
  },
  Gn = 1,
  Pd = function (e, t) {
    if (e > t.startScrollingFrom) return 0;
    if (e <= t.maxScrollValueAt) return Ge.maxPixelScroll;
    if (e === t.startScrollingFrom) return Gn;
    var r = va({
        startOfRange: t.maxScrollValueAt,
        endOfRange: t.startScrollingFrom,
        current: e,
      }),
      n = 1 - r,
      i = Ge.maxPixelScroll * Ge.ease(n);
    return Math.ceil(i);
  },
  Bi = Ge.durationDampening.accelerateAt,
  Li = Ge.durationDampening.stopDampeningAt,
  kd = function (e, t) {
    var r = t,
      n = Li,
      i = Date.now(),
      o = i - r;
    if (o >= Li) return e;
    if (o < Bi) return Gn;
    var a = va({ startOfRange: Bi, endOfRange: n, current: o }),
      s = e * Ge.ease(a);
    return Math.ceil(s);
  },
  Fi = function (e) {
    var t = e.distanceToEdge,
      r = e.thresholds,
      n = e.dragStartTime,
      i = e.shouldUseTimeDampening,
      o = Pd(t, r);
    return o === 0 ? 0 : i ? Math.max(kd(o, n), Gn) : o;
  },
  Ui = function (e) {
    var t = e.container,
      r = e.distanceToEdges,
      n = e.dragStartTime,
      i = e.axis,
      o = e.shouldUseTimeDampening,
      a = Nd(t, i),
      s = r[i.end] < r[i.start];
    return s
      ? Fi({
          distanceToEdge: r[i.end],
          thresholds: a,
          dragStartTime: n,
          shouldUseTimeDampening: o,
        })
      : -1 *
          Fi({
            distanceToEdge: r[i.start],
            thresholds: a,
            dragStartTime: n,
            shouldUseTimeDampening: o,
          });
  },
  Md = function (e) {
    var t = e.container,
      r = e.subject,
      n = e.proposedScroll,
      i = r.height > t.height,
      o = r.width > t.width;
    return !o && !i ? n : o && i ? null : { x: o ? 0 : n.x, y: i ? 0 : n.y };
  },
  Ad = qo(function (e) {
    return e === 0 ? 0 : e;
  }),
  ha = function (e) {
    var t = e.dragStartTime,
      r = e.container,
      n = e.subject,
      i = e.center,
      o = e.shouldUseTimeDampening,
      a = {
        top: i.y - r.top,
        right: r.right - i.x,
        bottom: r.bottom - i.y,
        left: i.x - r.left,
      },
      s = Ui({
        container: r,
        distanceToEdges: a,
        dragStartTime: t,
        axis: On,
        shouldUseTimeDampening: o,
      }),
      u = Ui({
        container: r,
        distanceToEdges: a,
        dragStartTime: t,
        axis: Ho,
        shouldUseTimeDampening: o,
      }),
      d = Ad({ x: u, y: s });
    if ($e(d, de)) return null;
    var c = Md({ container: r, subject: n, proposedScroll: d });
    return c ? ($e(c, de) ? null : c) : null;
  },
  Od = qo(function (e) {
    return e === 0 ? 0 : e > 0 ? 1 : -1;
  }),
  jn = (function () {
    var e = function (r, n) {
      return r < 0 ? r : r > n ? r - n : 0;
    };
    return function (t) {
      var r = t.current,
        n = t.max,
        i = t.change,
        o = ge(r, i),
        a = { x: e(o.x, n.x), y: e(o.y, n.y) };
      return $e(a, de) ? null : a;
    };
  })(),
  ba = function (t) {
    var r = t.max,
      n = t.current,
      i = t.change,
      o = { x: Math.max(n.x, r.x), y: Math.max(n.y, r.y) },
      a = Od(i),
      s = jn({ max: o, current: n, change: a });
    return !s || (a.x !== 0 && s.x === 0) || (a.y !== 0 && s.y === 0);
  },
  Wn = function (t, r) {
    return ba({ current: t.scroll.current, max: t.scroll.max, change: r });
  },
  Rd = function (t, r) {
    if (!Wn(t, r)) return null;
    var n = t.scroll.max,
      i = t.scroll.current;
    return jn({ current: i, max: n, change: r });
  },
  Vn = function (t, r) {
    var n = t.frame;
    return n
      ? ba({ current: n.scroll.current, max: n.scroll.max, change: r })
      : !1;
  },
  Td = function (t, r) {
    var n = t.frame;
    return !n || !Vn(t, r)
      ? null
      : jn({ current: n.scroll.current, max: n.scroll.max, change: r });
  },
  Bd = function (e) {
    var t = e.viewport,
      r = e.subject,
      n = e.center,
      i = e.dragStartTime,
      o = e.shouldUseTimeDampening,
      a = ha({
        dragStartTime: i,
        container: t.frame,
        subject: r,
        center: n,
        shouldUseTimeDampening: o,
      });
    return a && Wn(t, a) ? a : null;
  },
  Ld = function (e) {
    var t = e.droppable,
      r = e.subject,
      n = e.center,
      i = e.dragStartTime,
      o = e.shouldUseTimeDampening,
      a = t.frame;
    if (!a) return null;
    var s = ha({
      dragStartTime: i,
      container: a.pageMarginBox,
      subject: r,
      center: n,
      shouldUseTimeDampening: o,
    });
    return s && Vn(t, s) ? s : null;
  },
  qi = function (e) {
    var t = e.state,
      r = e.dragStartTime,
      n = e.shouldUseTimeDampening,
      i = e.scrollWindow,
      o = e.scrollDroppable,
      a = t.current.page.borderBoxCenter,
      s = t.dimensions.draggables[t.critical.draggable.id],
      u = s.page.marginBox;
    if (t.isWindowScrollAllowed) {
      var d = t.viewport,
        c = Bd({
          dragStartTime: r,
          viewport: d,
          subject: u,
          center: a,
          shouldUseTimeDampening: n,
        });
      if (c) {
        i(c);
        return;
      }
    }
    var p = _d({
      center: a,
      destination: we(t.impact),
      droppables: t.dimensions.droppables,
    });
    if (!!p) {
      var l = Ld({
        dragStartTime: r,
        droppable: p,
        subject: u,
        center: a,
        shouldUseTimeDampening: n,
      });
      l && o(p.descriptor.id, l);
    }
  },
  Fd = function (e) {
    var t = e.scrollWindow,
      r = e.scrollDroppable,
      n = St(t),
      i = St(r),
      o = null,
      a = function (c) {
        o || U(!1);
        var p = o,
          l = p.shouldUseTimeDampening,
          g = p.dragStartTime;
        qi({
          state: c,
          scrollWindow: n,
          scrollDroppable: i,
          dragStartTime: g,
          shouldUseTimeDampening: l,
        });
      },
      s = function (c) {
        o && U(!1);
        var p = Date.now(),
          l = !1,
          g = function () {
            l = !0;
          };
        (qi({
          state: c,
          dragStartTime: 0,
          shouldUseTimeDampening: !1,
          scrollWindow: g,
          scrollDroppable: g,
        }),
          (o = { dragStartTime: p, shouldUseTimeDampening: l }),
          l && a(c));
      },
      u = function () {
        !o || (n.cancel(), i.cancel(), (o = null));
      };
    return { start: s, stop: u, scroll: a };
  },
  Ud = function (e) {
    var t = e.move,
      r = e.scrollDroppable,
      n = e.scrollWindow,
      i = function (d, c) {
        var p = ge(d.current.client.selection, c);
        t({ client: p });
      },
      o = function (d, c) {
        if (!Vn(d, c)) return c;
        var p = Td(d, c);
        if (!p) return (r(d.descriptor.id, c), null);
        var l = ye(c, p);
        r(d.descriptor.id, l);
        var g = ye(c, l);
        return g;
      },
      a = function (d, c, p) {
        if (!d || !Wn(c, p)) return p;
        var l = Rd(c, p);
        if (!l) return (n(p), null);
        var g = ye(p, l);
        n(g);
        var h = ye(p, g);
        return h;
      },
      s = function (d) {
        var c = d.scrollJumpRequest;
        if (!!c) {
          var p = we(d.impact);
          p || U(!1);
          var l = o(d.dimensions.droppables[p], c);
          if (!!l) {
            var g = d.viewport,
              h = a(d.isWindowScrollAllowed, g, l);
            !h || i(d, h);
          }
        }
      };
    return s;
  },
  qd = function (e) {
    var t = e.scrollDroppable,
      r = e.scrollWindow,
      n = e.move,
      i = Fd({ scrollWindow: r, scrollDroppable: t }),
      o = Ud({ move: n, scrollWindow: r, scrollDroppable: t }),
      a = function (d) {
        if (d.phase === "DRAGGING") {
          if (d.movementMode === "FLUID") {
            i.scroll(d);
            return;
          }
          !d.scrollJumpRequest || o(d);
        }
      },
      s = { scroll: a, start: i.start, stop: i.stop };
    return s;
  },
  at = "data-rbd",
  st = (function () {
    var e = at + "-drag-handle";
    return {
      base: e,
      draggableId: e + "-draggable-id",
      contextId: e + "-context-id",
    };
  })(),
  mn = (function () {
    var e = at + "-draggable";
    return { base: e, contextId: e + "-context-id", id: e + "-id" };
  })(),
  $d = (function () {
    var e = at + "-droppable";
    return { base: e, contextId: e + "-context-id", id: e + "-id" };
  })(),
  $i = { contextId: at + "-scroll-container-context-id" },
  Gd = function (t) {
    return function (r) {
      return "[" + r + '="' + t + '"]';
    };
  },
  ht = function (t, r) {
    return t
      .map(function (n) {
        var i = n.styles[r];
        return i ? n.selector + " { " + i + " }" : "";
      })
      .join(" ");
  },
  jd = "pointer-events: none;",
  Wd = function (e) {
    var t = Gd(e),
      r = (function () {
        var s = `
      cursor: -webkit-grab;
      cursor: grab;
    `;
        return {
          selector: t(st.contextId),
          styles: {
            always: `
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          touch-action: manipulation;
        `,
            resting: s,
            dragging: jd,
            dropAnimating: s,
          },
        };
      })(),
      n = (function () {
        var s =
          `
      transition: ` +
          wt.outOfTheWay +
          `;
    `;
        return {
          selector: t(mn.contextId),
          styles: { dragging: s, dropAnimating: s, userCancel: s },
        };
      })(),
      i = {
        selector: t($d.contextId),
        styles: { always: "overflow-anchor: none;" },
      },
      o = {
        selector: "body",
        styles: {
          dragging: `
        cursor: grabbing;
        cursor: -webkit-grabbing;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        overflow-anchor: none;
      `,
        },
      },
      a = [n, r, i, o];
    return {
      always: ht(a, "always"),
      resting: ht(a, "resting"),
      dragging: ht(a, "dragging"),
      dropAnimating: ht(a, "dropAnimating"),
      userCancel: ht(a, "userCancel"),
    };
  },
  xe =
    typeof window < "u" &&
    typeof window.document < "u" &&
    typeof window.document.createElement < "u"
      ? x.exports.useLayoutEffect
      : x.exports.useEffect,
  Jr = function () {
    var t = document.querySelector("head");
    return (t || U(!1), t);
  },
  Gi = function (t) {
    var r = document.createElement("style");
    return (t && r.setAttribute("nonce", t), (r.type = "text/css"), r);
  };
function Vd(e, t) {
  var r = ne(
      function () {
        return Wd(e);
      },
      [e],
    ),
    n = x.exports.useRef(null),
    i = x.exports.useRef(null),
    o = H(
      ue(function (p) {
        var l = i.current;
        (l || U(!1), (l.textContent = p));
      }),
      [],
    ),
    a = H(function (p) {
      var l = n.current;
      (l || U(!1), (l.textContent = p));
    }, []);
  xe(
    function () {
      (!n.current && !i.current) || U(!1);
      var p = Gi(t),
        l = Gi(t);
      return (
        (n.current = p),
        (i.current = l),
        p.setAttribute(at + "-always", e),
        l.setAttribute(at + "-dynamic", e),
        Jr().appendChild(p),
        Jr().appendChild(l),
        a(r.always),
        o(r.resting),
        function () {
          var g = function (y) {
            var D = y.current;
            (D || U(!1), Jr().removeChild(D), (y.current = null));
          };
          (g(n), g(i));
        }
      );
    },
    [t, a, o, r.always, r.resting, e],
  );
  var s = H(
      function () {
        return o(r.dragging);
      },
      [o, r.dragging],
    ),
    u = H(
      function (p) {
        if (p === "DROP") {
          o(r.dropAnimating);
          return;
        }
        o(r.userCancel);
      },
      [o, r.dropAnimating, r.userCancel],
    ),
    d = H(
      function () {
        !i.current || o(r.resting);
      },
      [o, r.resting],
    ),
    c = ne(
      function () {
        return { dragging: s, dropping: u, resting: d };
      },
      [s, u, d],
    );
  return c;
}
var ya = function (e) {
  return e && e.ownerDocument ? e.ownerDocument.defaultView : window;
};
function Or(e) {
  return e instanceof ya(e).HTMLElement;
}
function Hd(e, t) {
  var r = "[" + st.contextId + '="' + e + '"]',
    n = $o(document.querySelectorAll(r));
  if (!n.length) return null;
  var i = Ve(n, function (o) {
    return o.getAttribute(st.draggableId) === t;
  });
  return !i || !Or(i) ? null : i;
}
function zd(e) {
  var t = x.exports.useRef({}),
    r = x.exports.useRef(null),
    n = x.exports.useRef(null),
    i = x.exports.useRef(!1),
    o = H(function (l, g) {
      var h = { id: l, focus: g };
      return (
        (t.current[l] = h),
        function () {
          var D = t.current,
            C = D[l];
          C !== h && delete D[l];
        }
      );
    }, []),
    a = H(
      function (l) {
        var g = Hd(e, l);
        g && g !== document.activeElement && g.focus();
      },
      [e],
    ),
    s = H(function (l, g) {
      r.current === l && (r.current = g);
    }, []),
    u = H(
      function () {
        n.current ||
          !i.current ||
          (n.current = requestAnimationFrame(function () {
            n.current = null;
            var l = r.current;
            l && a(l);
          }));
      },
      [a],
    ),
    d = H(function (l) {
      r.current = null;
      var g = document.activeElement;
      !g || (g.getAttribute(st.draggableId) === l && (r.current = l));
    }, []);
  xe(function () {
    return (
      (i.current = !0),
      function () {
        i.current = !1;
        var l = n.current;
        l && cancelAnimationFrame(l);
      }
    );
  }, []);
  var c = ne(
    function () {
      return {
        register: o,
        tryRecordFocus: d,
        tryRestoreFocusRecorded: u,
        tryShiftRecord: s,
      };
    },
    [o, d, u, s],
  );
  return c;
}
function Kd() {
  var e = { draggables: {}, droppables: {} },
    t = [];
  function r(p) {
    return (
      t.push(p),
      function () {
        var g = t.indexOf(p);
        g !== -1 && t.splice(g, 1);
      }
    );
  }
  function n(p) {
    t.length &&
      t.forEach(function (l) {
        return l(p);
      });
  }
  function i(p) {
    return e.draggables[p] || null;
  }
  function o(p) {
    var l = i(p);
    return (l || U(!1), l);
  }
  var a = {
    register: function (l) {
      ((e.draggables[l.descriptor.id] = l), n({ type: "ADDITION", value: l }));
    },
    update: function (l, g) {
      var h = e.draggables[g.descriptor.id];
      !h ||
        (h.uniqueId === l.uniqueId &&
          (delete e.draggables[g.descriptor.id],
          (e.draggables[l.descriptor.id] = l)));
    },
    unregister: function (l) {
      var g = l.descriptor.id,
        h = i(g);
      !h ||
        (l.uniqueId === h.uniqueId &&
          (delete e.draggables[g], n({ type: "REMOVAL", value: l })));
    },
    getById: o,
    findById: i,
    exists: function (l) {
      return Boolean(i(l));
    },
    getAllByType: function (l) {
      return cr(e.draggables).filter(function (g) {
        return g.descriptor.type === l;
      });
    },
  };
  function s(p) {
    return e.droppables[p] || null;
  }
  function u(p) {
    var l = s(p);
    return (l || U(!1), l);
  }
  var d = {
    register: function (l) {
      e.droppables[l.descriptor.id] = l;
    },
    unregister: function (l) {
      var g = s(l.descriptor.id);
      !g || (l.uniqueId === g.uniqueId && delete e.droppables[l.descriptor.id]);
    },
    getById: u,
    findById: s,
    exists: function (l) {
      return Boolean(s(l));
    },
    getAllByType: function (l) {
      return cr(e.droppables).filter(function (g) {
        return g.descriptor.type === l;
      });
    },
  };
  function c() {
    ((e.draggables = {}), (e.droppables = {}), (t.length = 0));
  }
  return { draggable: a, droppable: d, subscribe: r, clean: c };
}
function Jd() {
  var e = ne(Kd, []);
  return (
    x.exports.useEffect(
      function () {
        return function () {
          requestAnimationFrame(e.clean);
        };
      },
      [e],
    ),
    e
  );
}
var Hn = ce.createContext(null),
  dr = function () {
    var e = document.body;
    return (e || U(!1), e);
  },
  Yd = {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    border: "0",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    "clip-path": "inset(100%)",
  },
  Qd = function (t) {
    return "rbd-announcement-" + t;
  };
function Xd(e) {
  var t = ne(
      function () {
        return Qd(e);
      },
      [e],
    ),
    r = x.exports.useRef(null);
  x.exports.useEffect(
    function () {
      var o = document.createElement("div");
      return (
        (r.current = o),
        (o.id = t),
        o.setAttribute("aria-live", "assertive"),
        o.setAttribute("aria-atomic", "true"),
        Q(o.style, Yd),
        dr().appendChild(o),
        function () {
          setTimeout(function () {
            var u = dr();
            (u.contains(o) && u.removeChild(o),
              o === r.current && (r.current = null));
          });
        }
      );
    },
    [t],
  );
  var n = H(function (i) {
    var o = r.current;
    if (o) {
      o.textContent = i;
      return;
    }
  }, []);
  return n;
}
var Zd = 0,
  ep = { separator: "::" };
function zn(e, t) {
  return (
    t === void 0 && (t = ep),
    ne(
      function () {
        return "" + e + t.separator + Zd++;
      },
      [t.separator, e],
    )
  );
}
function tp(e) {
  var t = e.contextId,
    r = e.uniqueId;
  return "rbd-hidden-text-" + t + "-" + r;
}
function rp(e) {
  var t = e.contextId,
    r = e.text,
    n = zn("hidden-text", { separator: "-" }),
    i = ne(
      function () {
        return tp({ contextId: t, uniqueId: n });
      },
      [n, t],
    );
  return (
    x.exports.useEffect(
      function () {
        var a = document.createElement("div");
        return (
          (a.id = i),
          (a.textContent = r),
          (a.style.display = "none"),
          dr().appendChild(a),
          function () {
            var u = dr();
            u.contains(a) && u.removeChild(a);
          }
        );
      },
      [i, r],
    ),
    i
  );
}
var Rr = ce.createContext(null);
function wa(e) {
  var t = x.exports.useRef(e);
  return (
    x.exports.useEffect(function () {
      t.current = e;
    }),
    t
  );
}
function np() {
  var e = null;
  function t() {
    return Boolean(e);
  }
  function r(a) {
    return a === e;
  }
  function n(a) {
    e && U(!1);
    var s = { abandon: a };
    return ((e = s), s);
  }
  function i() {
    (e || U(!1), (e = null));
  }
  function o() {
    e && (e.abandon(), i());
  }
  return { isClaimed: t, isActive: r, claim: n, release: i, tryAbandon: o };
}
var ip = 9,
  op = 13,
  Kn = 27,
  xa = 32,
  ap = 33,
  sp = 34,
  lp = 35,
  cp = 36,
  up = 37,
  dp = 38,
  pp = 39,
  fp = 40,
  Kt,
  gp = ((Kt = {}), (Kt[op] = !0), (Kt[ip] = !0), Kt),
  Ia = function (e) {
    gp[e.keyCode] && e.preventDefault();
  },
  Tr = (function () {
    var e = "visibilitychange";
    if (typeof document > "u") return e;
    var t = [e, "ms" + e, "webkit" + e, "moz" + e, "o" + e],
      r = Ve(t, function (n) {
        return "on" + n in document;
      });
    return r || e;
  })(),
  Sa = 0,
  ji = 5;
function mp(e, t) {
  return Math.abs(t.x - e.x) >= ji || Math.abs(t.y - e.y) >= ji;
}
var Wi = { type: "IDLE" };
function vp(e) {
  var t = e.cancel,
    r = e.completed,
    n = e.getPhase,
    i = e.setPhase;
  return [
    {
      eventName: "mousemove",
      fn: function (a) {
        var s = a.button,
          u = a.clientX,
          d = a.clientY;
        if (s === Sa) {
          var c = { x: u, y: d },
            p = n();
          if (p.type === "DRAGGING") {
            (a.preventDefault(), p.actions.move(c));
            return;
          }
          p.type !== "PENDING" && U(!1);
          var l = p.point;
          if (!!mp(l, c)) {
            a.preventDefault();
            var g = p.actions.fluidLift(c);
            i({ type: "DRAGGING", actions: g });
          }
        }
      },
    },
    {
      eventName: "mouseup",
      fn: function (a) {
        var s = n();
        if (s.type !== "DRAGGING") {
          t();
          return;
        }
        (a.preventDefault(), s.actions.drop({ shouldBlockNextClick: !0 }), r());
      },
    },
    {
      eventName: "mousedown",
      fn: function (a) {
        (n().type === "DRAGGING" && a.preventDefault(), t());
      },
    },
    {
      eventName: "keydown",
      fn: function (a) {
        var s = n();
        if (s.type === "PENDING") {
          t();
          return;
        }
        if (a.keyCode === Kn) {
          (a.preventDefault(), t());
          return;
        }
        Ia(a);
      },
    },
    { eventName: "resize", fn: t },
    {
      eventName: "scroll",
      options: { passive: !0, capture: !1 },
      fn: function () {
        n().type === "PENDING" && t();
      },
    },
    {
      eventName: "webkitmouseforcedown",
      fn: function (a) {
        var s = n();
        if ((s.type === "IDLE" && U(!1), s.actions.shouldRespectForcePress())) {
          t();
          return;
        }
        a.preventDefault();
      },
    },
    { eventName: Tr, fn: t },
  ];
}
function hp(e) {
  var t = x.exports.useRef(Wi),
    r = x.exports.useRef(qe),
    n = ne(
      function () {
        return {
          eventName: "mousedown",
          fn: function (p) {
            if (
              !p.defaultPrevented &&
              p.button === Sa &&
              !(p.ctrlKey || p.metaKey || p.shiftKey || p.altKey)
            ) {
              var l = e.findClosestDraggableId(p);
              if (!!l) {
                var g = e.tryGetLock(l, a, { sourceEvent: p });
                if (!!g) {
                  p.preventDefault();
                  var h = { x: p.clientX, y: p.clientY };
                  (r.current(), d(g, h));
                }
              }
            }
          },
        };
      },
      [e],
    ),
    i = ne(
      function () {
        return {
          eventName: "webkitmouseforcewillbegin",
          fn: function (p) {
            if (!p.defaultPrevented) {
              var l = e.findClosestDraggableId(p);
              if (!!l) {
                var g = e.findOptionsForDraggable(l);
                !g ||
                  g.shouldRespectForcePress ||
                  !e.canGetLock(l) ||
                  p.preventDefault();
              }
            }
          },
        };
      },
      [e],
    ),
    o = H(
      function () {
        var p = { passive: !1, capture: !0 };
        r.current = Ee(window, [i, n], p);
      },
      [i, n],
    ),
    a = H(
      function () {
        var c = t.current;
        c.type !== "IDLE" && ((t.current = Wi), r.current(), o());
      },
      [o],
    ),
    s = H(
      function () {
        var c = t.current;
        (a(),
          c.type === "DRAGGING" &&
            c.actions.cancel({ shouldBlockNextClick: !0 }),
          c.type === "PENDING" && c.actions.abort());
      },
      [a],
    ),
    u = H(
      function () {
        var p = { capture: !0, passive: !1 },
          l = vp({
            cancel: s,
            completed: a,
            getPhase: function () {
              return t.current;
            },
            setPhase: function (h) {
              t.current = h;
            },
          });
        r.current = Ee(window, l, p);
      },
      [s, a],
    ),
    d = H(
      function (p, l) {
        (t.current.type !== "IDLE" && U(!1),
          (t.current = { type: "PENDING", point: l, actions: p }),
          u());
      },
      [u],
    );
  xe(
    function () {
      return (
        o(),
        function () {
          r.current();
        }
      );
    },
    [o],
  );
}
var nt;
function bp() {}
var yp =
  ((nt = {}), (nt[sp] = !0), (nt[ap] = !0), (nt[cp] = !0), (nt[lp] = !0), nt);
function wp(e, t) {
  function r() {
    (t(), e.cancel());
  }
  function n() {
    (t(), e.drop());
  }
  return [
    {
      eventName: "keydown",
      fn: function (o) {
        if (o.keyCode === Kn) {
          (o.preventDefault(), r());
          return;
        }
        if (o.keyCode === xa) {
          (o.preventDefault(), n());
          return;
        }
        if (o.keyCode === fp) {
          (o.preventDefault(), e.moveDown());
          return;
        }
        if (o.keyCode === dp) {
          (o.preventDefault(), e.moveUp());
          return;
        }
        if (o.keyCode === pp) {
          (o.preventDefault(), e.moveRight());
          return;
        }
        if (o.keyCode === up) {
          (o.preventDefault(), e.moveLeft());
          return;
        }
        if (yp[o.keyCode]) {
          o.preventDefault();
          return;
        }
        Ia(o);
      },
    },
    { eventName: "mousedown", fn: r },
    { eventName: "mouseup", fn: r },
    { eventName: "click", fn: r },
    { eventName: "touchstart", fn: r },
    { eventName: "resize", fn: r },
    { eventName: "wheel", fn: r, options: { passive: !0 } },
    { eventName: Tr, fn: r },
  ];
}
function xp(e) {
  var t = x.exports.useRef(bp),
    r = ne(
      function () {
        return {
          eventName: "keydown",
          fn: function (o) {
            if (o.defaultPrevented || o.keyCode !== xa) return;
            var a = e.findClosestDraggableId(o);
            if (!a) return;
            var s = e.tryGetLock(a, c, { sourceEvent: o });
            if (!s) return;
            o.preventDefault();
            var u = !0,
              d = s.snapLift();
            t.current();
            function c() {
              (u || U(!1), (u = !1), t.current(), n());
            }
            t.current = Ee(window, wp(d, c), { capture: !0, passive: !1 });
          },
        };
      },
      [e],
    ),
    n = H(
      function () {
        var o = { passive: !1, capture: !0 };
        t.current = Ee(window, [r], o);
      },
      [r],
    );
  xe(
    function () {
      return (
        n(),
        function () {
          t.current();
        }
      );
    },
    [n],
  );
}
var Yr = { type: "IDLE" },
  Ip = 120,
  Sp = 0.15;
function Cp(e) {
  var t = e.cancel,
    r = e.getPhase;
  return [
    { eventName: "orientationchange", fn: t },
    { eventName: "resize", fn: t },
    {
      eventName: "contextmenu",
      fn: function (i) {
        i.preventDefault();
      },
    },
    {
      eventName: "keydown",
      fn: function (i) {
        if (r().type !== "DRAGGING") {
          t();
          return;
        }
        (i.keyCode === Kn && i.preventDefault(), t());
      },
    },
    { eventName: Tr, fn: t },
  ];
}
function Ep(e) {
  var t = e.cancel,
    r = e.completed,
    n = e.getPhase;
  return [
    {
      eventName: "touchmove",
      options: { capture: !1 },
      fn: function (o) {
        var a = n();
        if (a.type !== "DRAGGING") {
          t();
          return;
        }
        a.hasMoved = !0;
        var s = o.touches[0],
          u = s.clientX,
          d = s.clientY,
          c = { x: u, y: d };
        (o.preventDefault(), a.actions.move(c));
      },
    },
    {
      eventName: "touchend",
      fn: function (o) {
        var a = n();
        if (a.type !== "DRAGGING") {
          t();
          return;
        }
        (o.preventDefault(), a.actions.drop({ shouldBlockNextClick: !0 }), r());
      },
    },
    {
      eventName: "touchcancel",
      fn: function (o) {
        if (n().type !== "DRAGGING") {
          t();
          return;
        }
        (o.preventDefault(), t());
      },
    },
    {
      eventName: "touchforcechange",
      fn: function (o) {
        var a = n();
        a.type === "IDLE" && U(!1);
        var s = o.touches[0];
        if (!!s) {
          var u = s.force >= Sp;
          if (!!u) {
            var d = a.actions.shouldRespectForcePress();
            if (a.type === "PENDING") {
              d && t();
              return;
            }
            if (d) {
              if (a.hasMoved) {
                o.preventDefault();
                return;
              }
              t();
              return;
            }
            o.preventDefault();
          }
        }
      },
    },
    { eventName: Tr, fn: t },
  ];
}
function Dp(e) {
  var t = x.exports.useRef(Yr),
    r = x.exports.useRef(qe),
    n = H(function () {
      return t.current;
    }, []),
    i = H(function (g) {
      t.current = g;
    }, []),
    o = ne(
      function () {
        return {
          eventName: "touchstart",
          fn: function (g) {
            if (!g.defaultPrevented) {
              var h = e.findClosestDraggableId(g);
              if (!!h) {
                var y = e.tryGetLock(h, s, { sourceEvent: g });
                if (!!y) {
                  var D = g.touches[0],
                    C = D.clientX,
                    w = D.clientY,
                    P = { x: C, y: w };
                  (r.current(), p(y, P));
                }
              }
            }
          },
        };
      },
      [e],
    ),
    a = H(
      function () {
        var g = { capture: !0, passive: !1 };
        r.current = Ee(window, [o], g);
      },
      [o],
    ),
    s = H(
      function () {
        var l = t.current;
        l.type !== "IDLE" &&
          (l.type === "PENDING" && clearTimeout(l.longPressTimerId),
          i(Yr),
          r.current(),
          a());
      },
      [a, i],
    ),
    u = H(
      function () {
        var l = t.current;
        (s(),
          l.type === "DRAGGING" &&
            l.actions.cancel({ shouldBlockNextClick: !0 }),
          l.type === "PENDING" && l.actions.abort());
      },
      [s],
    ),
    d = H(
      function () {
        var g = { capture: !0, passive: !1 },
          h = { cancel: u, completed: s, getPhase: n },
          y = Ee(window, Ep(h), g),
          D = Ee(window, Cp(h), g);
        r.current = function () {
          (y(), D());
        };
      },
      [u, n, s],
    ),
    c = H(
      function () {
        var g = n();
        g.type !== "PENDING" && U(!1);
        var h = g.actions.fluidLift(g.point);
        i({ type: "DRAGGING", actions: h, hasMoved: !1 });
      },
      [n, i],
    ),
    p = H(
      function (g, h) {
        n().type !== "IDLE" && U(!1);
        var y = setTimeout(c, Ip);
        (i({ type: "PENDING", point: h, actions: g, longPressTimerId: y }),
          d());
      },
      [d, n, i, c],
    );
  (xe(
    function () {
      return (
        a(),
        function () {
          r.current();
          var h = n();
          h.type === "PENDING" && (clearTimeout(h.longPressTimerId), i(Yr));
        }
      );
    },
    [n, a, i],
  ),
    xe(function () {
      var g = Ee(window, [
        {
          eventName: "touchmove",
          fn: function () {},
          options: { capture: !1, passive: !1 },
        },
      ]);
      return g;
    }, []));
}
var _p = {
  input: !0,
  button: !0,
  textarea: !0,
  select: !0,
  option: !0,
  optgroup: !0,
  video: !0,
  audio: !0,
};
function Ca(e, t) {
  if (t == null) return !1;
  var r = Boolean(_p[t.tagName.toLowerCase()]);
  if (r) return !0;
  var n = t.getAttribute("contenteditable");
  return n === "true" || n === "" ? !0 : t === e ? !1 : Ca(e, t.parentElement);
}
function Np(e, t) {
  var r = t.target;
  return Or(r) ? Ca(e, r) : !1;
}
var Pp = function (e) {
  return Pe(e.getBoundingClientRect()).center;
};
function kp(e) {
  return e instanceof ya(e).Element;
}
var Mp = (function () {
  var e = "matches";
  if (typeof document > "u") return e;
  var t = [e, "msMatchesSelector", "webkitMatchesSelector"],
    r = Ve(t, function (n) {
      return n in Element.prototype;
    });
  return r || e;
})();
function Ea(e, t) {
  return e == null ? null : e[Mp](t) ? e : Ea(e.parentElement, t);
}
function Ap(e, t) {
  return e.closest ? e.closest(t) : Ea(e, t);
}
function Op(e) {
  return "[" + st.contextId + '="' + e + '"]';
}
function Rp(e, t) {
  var r = t.target;
  if (!kp(r)) return null;
  var n = Op(e),
    i = Ap(r, n);
  return !i || !Or(i) ? null : i;
}
function Tp(e, t) {
  var r = Rp(e, t);
  return r ? r.getAttribute(st.draggableId) : null;
}
function Bp(e, t) {
  var r = "[" + mn.contextId + '="' + e + '"]',
    n = $o(document.querySelectorAll(r)),
    i = Ve(n, function (o) {
      return o.getAttribute(mn.id) === t;
    });
  return !i || !Or(i) ? null : i;
}
function Lp(e) {
  e.preventDefault();
}
function Jt(e) {
  var t = e.expected,
    r = e.phase,
    n = e.isLockActive;
  return (e.shouldWarn, !(!n() || t !== r));
}
function Da(e) {
  var t = e.lockAPI,
    r = e.store,
    n = e.registry,
    i = e.draggableId;
  if (t.isClaimed()) return !1;
  var o = n.draggable.findById(i);
  return !(!o || !o.options.isEnabled || !ma(r.getState(), i));
}
function Fp(e) {
  var t = e.lockAPI,
    r = e.contextId,
    n = e.store,
    i = e.registry,
    o = e.draggableId,
    a = e.forceSensorStop,
    s = e.sourceEvent,
    u = Da({ lockAPI: t, store: n, registry: i, draggableId: o });
  if (!u) return null;
  var d = i.draggable.getById(o),
    c = Bp(r, d.descriptor.id);
  if (!c || (s && !d.options.canDragInteractiveElements && Np(c, s)))
    return null;
  var p = t.claim(a || qe),
    l = "PRE_DRAG";
  function g() {
    return d.options.shouldRespectForcePress;
  }
  function h() {
    return t.isActive(p);
  }
  function y(B, W) {
    Jt({ expected: B, phase: l, isLockActive: h, shouldWarn: !0 }) &&
      n.dispatch(W());
  }
  var D = y.bind(null, "DRAGGING");
  function C(B) {
    function W() {
      (t.release(), (l = "COMPLETED"));
    }
    (l !== "PRE_DRAG" && (W(), l !== "PRE_DRAG" && U(!1)),
      n.dispatch(Mu(B.liftActionArgs)),
      (l = "DRAGGING"));
    function X(V, k) {
      if (
        (k === void 0 && (k = { shouldBlockNextClick: !1 }),
        B.cleanup(),
        k.shouldBlockNextClick)
      ) {
        var O = Ee(window, [
          {
            eventName: "click",
            fn: Lp,
            options: { once: !0, passive: !1, capture: !0 },
          },
        ]);
        setTimeout(O);
      }
      (W(), n.dispatch(la({ reason: V })));
    }
    return Q(
      {
        isActive: function () {
          return Jt({
            expected: "DRAGGING",
            phase: l,
            isLockActive: h,
            shouldWarn: !1,
          });
        },
        shouldRespectForcePress: g,
        drop: function (k) {
          return X("DROP", k);
        },
        cancel: function (k) {
          return X("CANCEL", k);
        },
      },
      B.actions,
    );
  }
  function w(B) {
    var W = St(function (V) {
        D(function () {
          return sa({ client: V });
        });
      }),
      X = C({
        liftActionArgs: { id: o, clientSelection: B, movementMode: "FLUID" },
        cleanup: function () {
          return W.cancel();
        },
        actions: { move: W },
      });
    return Q({}, X, { move: W });
  }
  function P() {
    var B = {
      moveUp: function () {
        return D(qu);
      },
      moveRight: function () {
        return D(Gu);
      },
      moveDown: function () {
        return D($u);
      },
      moveLeft: function () {
        return D(ju);
      },
    };
    return C({
      liftActionArgs: { id: o, clientSelection: Pp(c), movementMode: "SNAP" },
      cleanup: qe,
      actions: B,
    });
  }
  function _() {
    var B = Jt({
      expected: "PRE_DRAG",
      phase: l,
      isLockActive: h,
      shouldWarn: !0,
    });
    B && t.release();
  }
  var N = {
    isActive: function () {
      return Jt({
        expected: "PRE_DRAG",
        phase: l,
        isLockActive: h,
        shouldWarn: !1,
      });
    },
    shouldRespectForcePress: g,
    fluidLift: w,
    snapLift: P,
    abort: _,
  };
  return N;
}
var Up = [hp, xp, Dp];
function qp(e) {
  var t = e.contextId,
    r = e.store,
    n = e.registry,
    i = e.customSensors,
    o = e.enableDefaultSensors,
    a = [].concat(o ? Up : [], i || []),
    s = x.exports.useState(function () {
      return np();
    })[0],
    u = H(
      function (w, P) {
        w.isDragging && !P.isDragging && s.tryAbandon();
      },
      [s],
    );
  (xe(
    function () {
      var w = r.getState(),
        P = r.subscribe(function () {
          var _ = r.getState();
          (u(w, _), (w = _));
        });
      return P;
    },
    [s, r, u],
  ),
    xe(
      function () {
        return s.tryAbandon;
      },
      [s.tryAbandon],
    ));
  for (
    var d = H(
        function (C) {
          return Da({ lockAPI: s, registry: n, store: r, draggableId: C });
        },
        [s, n, r],
      ),
      c = H(
        function (C, w, P) {
          return Fp({
            lockAPI: s,
            registry: n,
            contextId: t,
            store: r,
            draggableId: C,
            forceSensorStop: w,
            sourceEvent: P && P.sourceEvent ? P.sourceEvent : null,
          });
        },
        [t, s, n, r],
      ),
      p = H(
        function (C) {
          return Tp(t, C);
        },
        [t],
      ),
      l = H(
        function (C) {
          var w = n.draggable.findById(C);
          return w ? w.options : null;
        },
        [n.draggable],
      ),
      g = H(
        function () {
          !s.isClaimed() ||
            (s.tryAbandon(), r.getState().phase !== "IDLE" && r.dispatch(Fn()));
        },
        [s, r],
      ),
      h = H(s.isClaimed, [s]),
      y = ne(
        function () {
          return {
            canGetLock: d,
            tryGetLock: c,
            findClosestDraggableId: p,
            findOptionsForDraggable: l,
            tryReleaseLock: g,
            isLockClaimed: h,
          };
        },
        [d, c, p, l, g, h],
      ),
      D = 0;
    D < a.length;
    D++
  )
    a[D](y);
}
var $p = function (t) {
  return {
    onBeforeCapture: t.onBeforeCapture,
    onBeforeDragStart: t.onBeforeDragStart,
    onDragStart: t.onDragStart,
    onDragEnd: t.onDragEnd,
    onDragUpdate: t.onDragUpdate,
  };
};
function bt(e) {
  return (e.current || U(!1), e.current);
}
function Gp(e) {
  var t = e.contextId,
    r = e.setCallbacks,
    n = e.sensors,
    i = e.nonce,
    o = e.dragHandleUsageInstructions,
    a = x.exports.useRef(null),
    s = wa(e),
    u = H(
      function () {
        return $p(s.current);
      },
      [s],
    ),
    d = Xd(t),
    c = rp({ contextId: t, text: o }),
    p = Vd(t, i),
    l = H(function (V) {
      bt(a).dispatch(V);
    }, []),
    g = ne(
      function () {
        return fi(
          {
            publishWhileDragging: Ou,
            updateDroppableScroll: Tu,
            updateDroppableIsEnabled: Bu,
            updateDroppableIsCombineEnabled: Lu,
            collectionStarting: Ru,
          },
          l,
        );
      },
      [l],
    ),
    h = Jd(),
    y = ne(
      function () {
        return Sd(h, g);
      },
      [h, g],
    ),
    D = ne(
      function () {
        return qd(
          Q(
            { scrollWindow: Cd, scrollDroppable: y.scrollDroppable },
            fi({ move: sa }, l),
          ),
        );
      },
      [y.scrollDroppable, l],
    ),
    C = zd(t),
    w = ne(
      function () {
        return yd({
          announce: d,
          autoScroller: D,
          dimensionMarshal: y,
          focusMarshal: C,
          getResponders: u,
          styleMarshal: p,
        });
      },
      [d, D, y, C, u, p],
    );
  a.current = w;
  var P = H(function () {
      var V = bt(a),
        k = V.getState();
      k.phase !== "IDLE" && V.dispatch(Fn());
    }, []),
    _ = H(function () {
      var V = bt(a).getState();
      return V.isDragging || V.phase === "DROP_ANIMATING";
    }, []),
    N = ne(
      function () {
        return { isDragging: _, tryAbort: P };
      },
      [_, P],
    );
  r(N);
  var B = H(function (V) {
      return ma(bt(a).getState(), V);
    }, []),
    W = H(function () {
      return Qe(bt(a).getState());
    }, []),
    X = ne(
      function () {
        return {
          marshal: y,
          focus: C,
          contextId: t,
          canLift: B,
          isMovementAllowed: W,
          dragHandleUsageInstructionsId: c,
          registry: h,
        };
      },
      [t, y, c, C, B, W, h],
    );
  return (
    qp({
      contextId: t,
      store: w,
      registry: h,
      customSensors: n,
      enableDefaultSensors: e.enableDefaultSensors !== !1,
    }),
    x.exports.useEffect(
      function () {
        return P;
      },
      [P],
    ),
    f(Rr.Provider, {
      value: X,
      children: f(pl, { context: Hn, store: w, children: e.children }),
    })
  );
}
var jp = 0;
function Wp() {
  return ne(function () {
    return "" + jp++;
  }, []);
}
function _a(e) {
  var t = Wp(),
    r = e.dragHandleUsageInstructions || tr.dragHandleUsageInstructions;
  return f(xc, {
    children: function (n) {
      return f(Gp, {
        nonce: e.nonce,
        contextId: t,
        setCallbacks: n,
        dragHandleUsageInstructions: r,
        enableDefaultSensors: e.enableDefaultSensors,
        sensors: e.sensors,
        onBeforeCapture: e.onBeforeCapture,
        onBeforeDragStart: e.onBeforeDragStart,
        onDragStart: e.onDragStart,
        onDragUpdate: e.onDragUpdate,
        onDragEnd: e.onDragEnd,
        children: e.children,
      });
    },
  });
}
var Na = function (t) {
    return function (r) {
      return t === r;
    };
  },
  Vp = Na("scroll"),
  Hp = Na("auto"),
  Vi = function (t, r) {
    return r(t.overflowX) || r(t.overflowY);
  },
  zp = function (t) {
    var r = window.getComputedStyle(t),
      n = { overflowX: r.overflowX, overflowY: r.overflowY };
    return Vi(n, Vp) || Vi(n, Hp);
  },
  Kp = function () {
    return !1;
  },
  Jp = function e(t) {
    return t == null
      ? null
      : t === document.body
        ? Kp()
          ? t
          : null
        : t === document.documentElement
          ? null
          : zp(t)
            ? t
            : e(t.parentElement);
  },
  vn = function (e) {
    return { x: e.scrollLeft, y: e.scrollTop };
  },
  Yp = function e(t) {
    if (!t) return !1;
    var r = window.getComputedStyle(t);
    return r.position === "fixed" ? !0 : e(t.parentElement);
  },
  Qp = function (e) {
    var t = Jp(e),
      r = Yp(e);
    return { closestScrollable: t, isFixedOnPage: r };
  },
  Xp = function (e) {
    var t = e.descriptor,
      r = e.isEnabled,
      n = e.isCombineEnabled,
      i = e.isFixedOnPage,
      o = e.direction,
      a = e.client,
      s = e.page,
      u = e.closest,
      d = (function () {
        if (!u) return null;
        var g = u.scrollSize,
          h = u.client,
          y = pa({
            scrollHeight: g.scrollHeight,
            scrollWidth: g.scrollWidth,
            height: h.paddingBox.height,
            width: h.paddingBox.width,
          });
        return {
          pageMarginBox: u.page.marginBox,
          frameClient: h,
          scrollSize: g,
          shouldClipSubject: u.shouldClipSubject,
          scroll: {
            initial: u.scroll,
            current: u.scroll,
            max: y,
            diff: { value: de, displacement: de },
          },
        };
      })(),
      c = o === "vertical" ? On : Ho,
      p = ot({ page: s, withPlaceholder: null, axis: c, frame: d }),
      l = {
        descriptor: t,
        isCombineEnabled: n,
        isFixedOnPage: i,
        axis: c,
        isEnabled: r,
        client: a,
        page: s,
        frame: d,
        subject: p,
      };
    return l;
  },
  Zp = function (t, r) {
    var n = Bo(t);
    if (!r || t !== r) return n;
    var i = n.paddingBox.top - r.scrollTop,
      o = n.paddingBox.left - r.scrollLeft,
      a = i + r.scrollHeight,
      s = o + r.scrollWidth,
      u = { top: i, right: s, bottom: a, left: o },
      d = Nn(u, n.border),
      c = Pn({
        borderBox: d,
        margin: n.margin,
        border: n.border,
        padding: n.padding,
      });
    return c;
  },
  ef = function (e) {
    var t = e.ref,
      r = e.descriptor,
      n = e.env,
      i = e.windowScroll,
      o = e.direction,
      a = e.isDropDisabled,
      s = e.isCombineEnabled,
      u = e.shouldClipSubject,
      d = n.closestScrollable,
      c = Zp(t, d),
      p = ar(c, i),
      l = (function () {
        if (!d) return null;
        var h = Bo(d),
          y = { scrollHeight: d.scrollHeight, scrollWidth: d.scrollWidth };
        return {
          client: h,
          page: ar(h, i),
          scroll: vn(d),
          scrollSize: y,
          shouldClipSubject: u,
        };
      })(),
      g = Xp({
        descriptor: r,
        isEnabled: !a,
        isCombineEnabled: s,
        isFixedOnPage: n.isFixedOnPage,
        direction: o,
        client: c,
        page: p,
        closest: l,
      });
    return g;
  },
  tf = { passive: !1 },
  rf = { passive: !0 },
  Hi = function (e) {
    return e.shouldPublishImmediately ? tf : rf;
  };
function pr(e) {
  var t = x.exports.useContext(e);
  return (t || U(!1), t);
}
var Yt = function (t) {
  return (t && t.env.closestScrollable) || null;
};
function nf(e) {
  var t = x.exports.useRef(null),
    r = pr(Rr),
    n = zn("droppable"),
    i = r.registry,
    o = r.marshal,
    a = wa(e),
    s = ne(
      function () {
        return { id: e.droppableId, type: e.type, mode: e.mode };
      },
      [e.droppableId, e.mode, e.type],
    ),
    u = x.exports.useRef(s),
    d = ne(
      function () {
        return ue(function (_, N) {
          t.current || U(!1);
          var B = { x: _, y: N };
          o.updateDroppableScroll(s.id, B);
        });
      },
      [s.id, o],
    ),
    c = H(function () {
      var _ = t.current;
      return !_ || !_.env.closestScrollable ? de : vn(_.env.closestScrollable);
    }, []),
    p = H(
      function () {
        var _ = c();
        d(_.x, _.y);
      },
      [c, d],
    ),
    l = ne(
      function () {
        return St(p);
      },
      [p],
    ),
    g = H(
      function () {
        var _ = t.current,
          N = Yt(_);
        (_ && N) || U(!1);
        var B = _.scrollOptions;
        if (B.shouldPublishImmediately) {
          p();
          return;
        }
        l();
      },
      [l, p],
    ),
    h = H(
      function (_, N) {
        t.current && U(!1);
        var B = a.current,
          W = B.getDroppableRef();
        W || U(!1);
        var X = Qp(W),
          V = { ref: W, descriptor: s, env: X, scrollOptions: N };
        t.current = V;
        var k = ef({
            ref: W,
            descriptor: s,
            env: X,
            windowScroll: _,
            direction: B.direction,
            isDropDisabled: B.isDropDisabled,
            isCombineEnabled: B.isCombineEnabled,
            shouldClipSubject: !B.ignoreContainerClipping,
          }),
          O = X.closestScrollable;
        return (
          O &&
            (O.setAttribute($i.contextId, r.contextId),
            O.addEventListener("scroll", g, Hi(V.scrollOptions))),
          k
        );
      },
      [r.contextId, s, g, a],
    ),
    y = H(function () {
      var _ = t.current,
        N = Yt(_);
      return ((_ && N) || U(!1), vn(N));
    }, []),
    D = H(
      function () {
        var _ = t.current;
        _ || U(!1);
        var N = Yt(_);
        ((t.current = null),
          N &&
            (l.cancel(),
            N.removeAttribute($i.contextId),
            N.removeEventListener("scroll", g, Hi(_.scrollOptions))));
      },
      [g, l],
    ),
    C = H(function (_) {
      var N = t.current;
      N || U(!1);
      var B = Yt(N);
      (B || U(!1), (B.scrollTop += _.y), (B.scrollLeft += _.x));
    }, []),
    w = ne(
      function () {
        return {
          getDimensionAndWatchScroll: h,
          getScrollWhileDragging: y,
          dragStopped: D,
          scroll: C,
        };
      },
      [D, h, y, C],
    ),
    P = ne(
      function () {
        return { uniqueId: n, descriptor: s, callbacks: w };
      },
      [w, s, n],
    );
  (xe(
    function () {
      return (
        (u.current = P.descriptor),
        i.droppable.register(P),
        function () {
          (t.current && D(), i.droppable.unregister(P));
        }
      );
    },
    [w, s, D, P, o, i.droppable],
  ),
    xe(
      function () {
        !t.current ||
          o.updateDroppableIsEnabled(u.current.id, !e.isDropDisabled);
      },
      [e.isDropDisabled, o],
    ),
    xe(
      function () {
        !t.current ||
          o.updateDroppableIsCombineEnabled(u.current.id, e.isCombineEnabled);
      },
      [e.isCombineEnabled, o],
    ));
}
function Qr() {}
var zi = { width: 0, height: 0, margin: _c },
  of = function (t) {
    var r = t.isAnimatingOpenOnMount,
      n = t.placeholder,
      i = t.animate;
    return r || i === "close"
      ? zi
      : {
          height: n.client.borderBox.height,
          width: n.client.borderBox.width,
          margin: n.client.margin,
        };
  },
  af = function (t) {
    var r = t.isAnimatingOpenOnMount,
      n = t.placeholder,
      i = t.animate,
      o = of({ isAnimatingOpenOnMount: r, placeholder: n, animate: i });
    return {
      display: n.display,
      boxSizing: "border-box",
      width: o.width,
      height: o.height,
      marginTop: o.margin.top,
      marginRight: o.margin.right,
      marginBottom: o.margin.bottom,
      marginLeft: o.margin.left,
      flexShrink: "0",
      flexGrow: "0",
      pointerEvents: "none",
      transition: i !== "none" ? wt.placeholder : null,
    };
  };
function sf(e) {
  var t = x.exports.useRef(null),
    r = H(function () {
      !t.current || (clearTimeout(t.current), (t.current = null));
    }, []),
    n = e.animate,
    i = e.onTransitionEnd,
    o = e.onClose,
    a = e.contextId,
    s = x.exports.useState(e.animate === "open"),
    u = s[0],
    d = s[1];
  x.exports.useEffect(
    function () {
      return u
        ? n !== "open"
          ? (r(), d(!1), Qr)
          : t.current
            ? Qr
            : ((t.current = setTimeout(function () {
                ((t.current = null), d(!1));
              })),
              r)
        : Qr;
    },
    [n, u, r],
  );
  var c = H(
      function (l) {
        l.propertyName === "height" && (i(), n === "close" && o());
      },
      [n, o, i],
    ),
    p = af({
      isAnimatingOpenOnMount: u,
      animate: e.animate,
      placeholder: e.placeholder,
    });
  return ce.createElement(e.placeholder.tagName, {
    style: p,
    "data-rbd-placeholder-context-id": a,
    onTransitionEnd: c,
    ref: e.innerRef,
  });
}
var lf = ce.memo(sf),
  Jn = ce.createContext(null),
  cf = (function (e) {
    mo(t, e);
    function t() {
      for (var n, i = arguments.length, o = new Array(i), a = 0; a < i; a++)
        o[a] = arguments[a];
      return (
        (n = e.call.apply(e, [this].concat(o)) || this),
        (n.state = {
          isVisible: Boolean(n.props.on),
          data: n.props.on,
          animate: n.props.shouldAnimate && n.props.on ? "open" : "none",
        }),
        (n.onClose = function () {
          n.state.animate === "close" && n.setState({ isVisible: !1 });
        }),
        n
      );
    }
    t.getDerivedStateFromProps = function (i, o) {
      return i.shouldAnimate
        ? i.on
          ? { isVisible: !0, data: i.on, animate: "open" }
          : o.isVisible
            ? { isVisible: !0, data: o.data, animate: "close" }
            : { isVisible: !1, animate: "close", data: null }
        : { isVisible: Boolean(i.on), data: i.on, animate: "none" };
    };
    var r = t.prototype;
    return (
      (r.render = function () {
        if (!this.state.isVisible) return null;
        var i = {
          onClose: this.onClose,
          data: this.state.data,
          animate: this.state.animate,
        };
        return this.props.children(i);
      }),
      t
    );
  })(ce.PureComponent),
  Ki = { dragging: 5e3, dropAnimating: 4500 },
  uf = function (t, r) {
    return r ? wt.drop(r.duration) : t ? wt.snap : wt.fluid;
  },
  df = function (t, r) {
    return t ? (r ? _t.opacity.drop : _t.opacity.combining) : null;
  },
  pf = function (t) {
    return t.forceShouldAnimate != null
      ? t.forceShouldAnimate
      : t.mode === "SNAP";
  };
function ff(e) {
  var t = e.dimension,
    r = t.client,
    n = e.offset,
    i = e.combineWith,
    o = e.dropping,
    a = Boolean(i),
    s = pf(e),
    u = Boolean(o),
    d = u ? fn.drop(n, a) : fn.moveTo(n),
    c = {
      position: "fixed",
      top: r.marginBox.top,
      left: r.marginBox.left,
      boxSizing: "border-box",
      width: r.borderBox.width,
      height: r.borderBox.height,
      transition: uf(s, o),
      transform: d,
      opacity: df(a, u),
      zIndex: u ? Ki.dropAnimating : Ki.dragging,
      pointerEvents: "none",
    };
  return c;
}
function gf(e) {
  return {
    transform: fn.moveTo(e.offset),
    transition: e.shouldAnimateDisplacement ? null : "none",
  };
}
function mf(e) {
  return e.type === "DRAGGING" ? ff(e) : gf(e);
}
function vf(e, t, r) {
  r === void 0 && (r = de);
  var n = window.getComputedStyle(t),
    i = t.getBoundingClientRect(),
    o = To(i, n),
    a = ar(o, r),
    s = { client: o, tagName: t.tagName.toLowerCase(), display: n.display },
    u = { x: o.marginBox.width, y: o.marginBox.height },
    d = { descriptor: e, placeholder: s, displaceBy: u, client: o, page: a };
  return d;
}
function hf(e) {
  var t = zn("draggable"),
    r = e.descriptor,
    n = e.registry,
    i = e.getDraggableRef,
    o = e.canDragInteractiveElements,
    a = e.shouldRespectForcePress,
    s = e.isEnabled,
    u = ne(
      function () {
        return {
          canDragInteractiveElements: o,
          shouldRespectForcePress: a,
          isEnabled: s,
        };
      },
      [o, s, a],
    ),
    d = H(
      function (g) {
        var h = i();
        return (h || U(!1), vf(r, h, g));
      },
      [r, i],
    ),
    c = ne(
      function () {
        return { uniqueId: t, descriptor: r, options: u, getDimension: d };
      },
      [r, d, u, t],
    ),
    p = x.exports.useRef(c),
    l = x.exports.useRef(!0);
  (xe(
    function () {
      return (
        n.draggable.register(p.current),
        function () {
          return n.draggable.unregister(p.current);
        }
      );
    },
    [n.draggable],
  ),
    xe(
      function () {
        if (l.current) {
          l.current = !1;
          return;
        }
        var g = p.current;
        ((p.current = c), n.draggable.update(c, g));
      },
      [c, n.draggable],
    ));
}
function bf(e) {
  e.preventDefault();
}
function yf(e) {
  var t = x.exports.useRef(null),
    r = H(function (V) {
      t.current = V;
    }, []),
    n = H(function () {
      return t.current;
    }, []),
    i = pr(Rr),
    o = i.contextId,
    a = i.dragHandleUsageInstructionsId,
    s = i.registry,
    u = pr(Jn),
    d = u.type,
    c = u.droppableId,
    p = ne(
      function () {
        return { id: e.draggableId, index: e.index, type: d, droppableId: c };
      },
      [e.draggableId, e.index, d, c],
    ),
    l = e.children,
    g = e.draggableId,
    h = e.isEnabled,
    y = e.shouldRespectForcePress,
    D = e.canDragInteractiveElements,
    C = e.isClone,
    w = e.mapped,
    P = e.dropAnimationFinished;
  if (!C) {
    var _ = ne(
      function () {
        return {
          descriptor: p,
          registry: s,
          getDraggableRef: n,
          canDragInteractiveElements: D,
          shouldRespectForcePress: y,
          isEnabled: h,
        };
      },
      [p, s, n, D, y, h],
    );
    hf(_);
  }
  var N = ne(
      function () {
        return h
          ? {
              tabIndex: 0,
              role: "button",
              "aria-describedby": a,
              "data-rbd-drag-handle-draggable-id": g,
              "data-rbd-drag-handle-context-id": o,
              draggable: !1,
              onDragStart: bf,
            }
          : null;
      },
      [o, a, g, h],
    ),
    B = H(
      function (V) {
        w.type === "DRAGGING" &&
          (!w.dropping || (V.propertyName === "transform" && P()));
      },
      [P, w],
    ),
    W = ne(
      function () {
        var V = mf(w),
          k = w.type === "DRAGGING" && w.dropping ? B : null,
          O = {
            innerRef: r,
            draggableProps: {
              "data-rbd-draggable-context-id": o,
              "data-rbd-draggable-id": g,
              style: V,
              onTransitionEnd: k,
            },
            dragHandleProps: N,
          };
        return O;
      },
      [o, N, g, w, B, r],
    ),
    X = ne(
      function () {
        return {
          draggableId: p.id,
          type: p.type,
          source: { index: p.index, droppableId: p.droppableId },
        };
      },
      [p.droppableId, p.id, p.index, p.type],
    );
  return l(W, w.snapshot, X);
}
var Pa = function (e, t) {
    return e === t;
  },
  ka = function (e) {
    var t = e.combine,
      r = e.destination;
    return r ? r.droppableId : t ? t.droppableId : null;
  },
  wf = function (t) {
    return t.combine ? t.combine.draggableId : null;
  },
  xf = function (t) {
    return t.at && t.at.type === "COMBINE" ? t.at.combine.draggableId : null;
  };
function If() {
  var e = ue(function (i, o) {
      return { x: i, y: o };
    }),
    t = ue(function (i, o, a, s, u) {
      return {
        isDragging: !0,
        isClone: o,
        isDropAnimating: Boolean(u),
        dropAnimation: u,
        mode: i,
        draggingOver: a,
        combineWith: s,
        combineTargetFor: null,
      };
    }),
    r = ue(function (i, o, a, s, u, d, c) {
      return {
        mapped: {
          type: "DRAGGING",
          dropping: null,
          draggingOver: u,
          combineWith: d,
          mode: o,
          offset: i,
          dimension: a,
          forceShouldAnimate: c,
          snapshot: t(o, s, u, d, null),
        },
      };
    }),
    n = function (o, a) {
      if (o.isDragging) {
        if (o.critical.draggable.id !== a.draggableId) return null;
        var s = o.current.client.offset,
          u = o.dimensions.draggables[a.draggableId],
          d = we(o.impact),
          c = xf(o.impact),
          p = o.forceShouldAnimate;
        return r(e(s.x, s.y), o.movementMode, u, a.isClone, d, c, p);
      }
      if (o.phase === "DROP_ANIMATING") {
        var l = o.completed;
        if (l.result.draggableId !== a.draggableId) return null;
        var g = a.isClone,
          h = o.dimensions.draggables[a.draggableId],
          y = l.result,
          D = y.mode,
          C = ka(y),
          w = wf(y),
          P = o.dropDuration,
          _ = {
            duration: P,
            curve: qn.drop,
            moveTo: o.newHomeClientOffset,
            opacity: w ? _t.opacity.drop : null,
            scale: w ? _t.scale.drop : null,
          };
        return {
          mapped: {
            type: "DRAGGING",
            offset: o.newHomeClientOffset,
            dimension: h,
            dropping: _,
            draggingOver: C,
            combineWith: w,
            mode: D,
            forceShouldAnimate: null,
            snapshot: t(D, g, C, w, _),
          },
        };
      }
      return null;
    };
  return n;
}
function Ma(e) {
  return {
    isDragging: !1,
    isDropAnimating: !1,
    isClone: !1,
    dropAnimation: null,
    mode: null,
    draggingOver: null,
    combineTargetFor: e,
    combineWith: null,
  };
}
var Sf = {
  mapped: {
    type: "SECONDARY",
    offset: de,
    combineTargetFor: null,
    shouldAnimateDisplacement: !0,
    snapshot: Ma(null),
  },
};
function Cf() {
  var e = ue(function (a, s) {
      return { x: a, y: s };
    }),
    t = ue(Ma),
    r = ue(function (a, s, u) {
      return (
        s === void 0 && (s = null),
        {
          mapped: {
            type: "SECONDARY",
            offset: a,
            combineTargetFor: s,
            shouldAnimateDisplacement: u,
            snapshot: t(s),
          },
        }
      );
    }),
    n = function (s) {
      return s ? r(de, s, !0) : null;
    },
    i = function (s, u, d, c) {
      var p = d.displaced.visible[s],
        l = Boolean(c.inVirtualList && c.effected[s]),
        g = kr(d),
        h = g && g.draggableId === s ? u : null;
      if (!p) {
        if (!l) return n(h);
        if (d.displaced.invisible[s]) return null;
        var y = lt(c.displacedBy.point),
          D = e(y.x, y.y);
        return r(D, h, !0);
      }
      if (l) return n(h);
      var C = d.displacedBy.point,
        w = e(C.x, C.y);
      return r(w, h, p.shouldAnimate);
    },
    o = function (s, u) {
      if (s.isDragging)
        return s.critical.draggable.id === u.draggableId
          ? null
          : i(
              u.draggableId,
              s.critical.draggable.id,
              s.impact,
              s.afterCritical,
            );
      if (s.phase === "DROP_ANIMATING") {
        var d = s.completed;
        return d.result.draggableId === u.draggableId
          ? null
          : i(u.draggableId, d.result.draggableId, d.impact, d.afterCritical);
      }
      return null;
    };
  return o;
}
var Ef = function () {
    var t = If(),
      r = Cf(),
      n = function (o, a) {
        return t(o, a) || r(o, a) || Sf;
      };
    return n;
  },
  Df = { dropAnimationFinished: ca },
  _f = Oo(Ef, Df, null, { context: Hn, pure: !0, areStatePropsEqual: Pa })(yf);
function Aa(e) {
  var t = pr(Jn),
    r = t.isUsingCloneFor;
  return r === e.draggableId && !e.isClone ? null : f(_f, { ...e });
}
function fr(e) {
  var t = typeof e.isDragDisabled == "boolean" ? !e.isDragDisabled : !0,
    r = Boolean(e.disableInteractiveElementBlocking),
    n = Boolean(e.shouldRespectForcePress);
  return f(Aa, {
    ...e,
    isClone: !1,
    isEnabled: t,
    canDragInteractiveElements: r,
    shouldRespectForcePress: n,
  });
}
function Nf(e) {
  var t = x.exports.useContext(Rr);
  t || U(!1);
  var r = t.contextId,
    n = t.isMovementAllowed,
    i = x.exports.useRef(null),
    o = x.exports.useRef(null),
    a = e.children,
    s = e.droppableId,
    u = e.type,
    d = e.mode,
    c = e.direction,
    p = e.ignoreContainerClipping,
    l = e.isDropDisabled,
    g = e.isCombineEnabled,
    h = e.snapshot,
    y = e.useClone,
    D = e.updateViewportMaxScroll,
    C = e.getContainerForClone,
    w = H(function () {
      return i.current;
    }, []),
    P = H(function (O) {
      i.current = O;
    }, []);
  H(function () {
    return o.current;
  }, []);
  var _ = H(function (O) {
      o.current = O;
    }, []),
    N = H(
      function () {
        n() && D({ maxScroll: ga() });
      },
      [n, D],
    );
  nf({
    droppableId: s,
    type: u,
    mode: d,
    direction: c,
    isDropDisabled: l,
    isCombineEnabled: g,
    ignoreContainerClipping: p,
    getDroppableRef: w,
  });
  var B = f(cf, {
      on: e.placeholder,
      shouldAnimate: e.shouldAnimatePlaceholder,
      children: function (O) {
        var q = O.onClose,
          m = O.data,
          v = O.animate;
        return f(lf, {
          placeholder: m,
          onClose: q,
          innerRef: _,
          animate: v,
          contextId: r,
          onTransitionEnd: N,
        });
      },
    }),
    W = ne(
      function () {
        return {
          innerRef: P,
          placeholder: B,
          droppableProps: {
            "data-rbd-droppable-id": s,
            "data-rbd-droppable-context-id": r,
          },
        };
      },
      [r, s, B, P],
    ),
    X = y ? y.dragging.draggableId : null,
    V = ne(
      function () {
        return { droppableId: s, type: u, isUsingCloneFor: X };
      },
      [s, X, u],
    );
  function k() {
    if (!y) return null;
    var O = y.dragging,
      q = y.render,
      m = f(Aa, {
        draggableId: O.draggableId,
        index: O.source.index,
        isClone: !0,
        isEnabled: !0,
        shouldRespectForcePress: !1,
        canDragInteractiveElements: !0,
        children: function (v, b) {
          return q(v, b, O);
        },
      });
    return us.createPortal(m, C());
  }
  return I(Jn.Provider, { value: V, children: [a(W, h), k()] });
}
var Xr = function (t, r) {
    return t === r.droppable.type;
  },
  Ji = function (t, r) {
    return r.draggables[t.draggable.id];
  },
  Pf = function () {
    var t = {
        placeholder: null,
        shouldAnimatePlaceholder: !0,
        snapshot: {
          isDraggingOver: !1,
          draggingOverWith: null,
          draggingFromThisWith: null,
          isUsingPlaceholder: !1,
        },
        useClone: null,
      },
      r = Q({}, t, { shouldAnimatePlaceholder: !1 }),
      n = ue(function (a) {
        return {
          draggableId: a.id,
          type: a.type,
          source: { index: a.index, droppableId: a.droppableId },
        };
      }),
      i = ue(function (a, s, u, d, c, p) {
        var l = c.descriptor.id,
          g = c.descriptor.droppableId === a;
        if (g) {
          var h = p ? { render: p, dragging: n(c.descriptor) } : null,
            y = {
              isDraggingOver: u,
              draggingOverWith: u ? l : null,
              draggingFromThisWith: l,
              isUsingPlaceholder: !0,
            };
          return {
            placeholder: c.placeholder,
            shouldAnimatePlaceholder: !1,
            snapshot: y,
            useClone: h,
          };
        }
        if (!s) return r;
        if (!d) return t;
        var D = {
          isDraggingOver: u,
          draggingOverWith: l,
          draggingFromThisWith: null,
          isUsingPlaceholder: !0,
        };
        return {
          placeholder: c.placeholder,
          shouldAnimatePlaceholder: !0,
          snapshot: D,
          useClone: null,
        };
      }),
      o = function (s, u) {
        var d = u.droppableId,
          c = u.type,
          p = !u.isDropDisabled,
          l = u.renderClone;
        if (s.isDragging) {
          var g = s.critical;
          if (!Xr(c, g)) return r;
          var h = Ji(g, s.dimensions),
            y = we(s.impact) === d;
          return i(d, p, y, y, h, l);
        }
        if (s.phase === "DROP_ANIMATING") {
          var D = s.completed;
          if (!Xr(c, D.critical)) return r;
          var C = Ji(D.critical, s.dimensions);
          return i(d, p, ka(D.result) === d, we(D.impact) === d, C, l);
        }
        if (s.phase === "IDLE" && s.completed && !s.shouldFlush) {
          var w = s.completed;
          if (!Xr(c, w.critical)) return r;
          var P = we(w.impact) === d,
            _ = Boolean(w.impact.at && w.impact.at.type === "COMBINE"),
            N = w.critical.droppable.id === d;
          return P ? (_ ? t : r) : N ? t : r;
        }
        return r;
      };
    return o;
  },
  kf = { updateViewportMaxScroll: Uu };
function Mf() {
  return (document.body || U(!1), document.body);
}
var Af = {
    mode: "standard",
    type: "DEFAULT",
    direction: "vertical",
    isDropDisabled: !1,
    isCombineEnabled: !1,
    ignoreContainerClipping: !1,
    renderClone: null,
    getContainerForClone: Mf,
  },
  Nt = Oo(Pf, kf, null, { context: Hn, pure: !0, areStatePropsEqual: Pa })(Nf);
Nt.defaultProps = Af;
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Of = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  Oa = (...e) =>
    e.filter((t, r, n) => Boolean(t) && n.indexOf(t) === r).join(" ");
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var Rf = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Tf = x.exports.forwardRef(
  (
    {
      color: e = "currentColor",
      size: t = 24,
      strokeWidth: r = 2,
      absoluteStrokeWidth: n,
      className: i = "",
      children: o,
      iconNode: a,
      ...s
    },
    u,
  ) =>
    x.exports.createElement(
      "svg",
      {
        ref: u,
        ...Rf,
        width: t,
        height: t,
        stroke: e,
        strokeWidth: n ? (Number(r) * 24) / Number(t) : r,
        className: Oa("lucide", i),
        ...s,
      },
      [
        ...a.map(([d, c]) => x.exports.createElement(d, c)),
        ...(Array.isArray(o) ? o : [o]),
      ],
    ),
);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const te = (e, t) => {
  const r = x.exports.forwardRef(({ className: n, ...i }, o) =>
    x.exports.createElement(Tf, {
      ref: o,
      iconNode: t,
      className: Oa(`lucide-${Of(e)}`, n),
      ...i,
    }),
  );
  return ((r.displayName = `${e}`), r);
};
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Bf = te("BadgeCheck", [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
      key: "3c2336",
    },
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Lf = te("BadgeHelp", [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
      key: "3c2336",
    },
  ],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["line", { x1: "12", x2: "12.01", y1: "17", y2: "17", key: "io3f8k" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ff = te("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Uf = te("BotMessageSquare", [
  ["path", { d: "M12 6V2H8", key: "1155em" }],
  [
    "path",
    {
      d: "m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z",
      key: "w2lp3e",
    },
  ],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M9 11v2", key: "1ueba0" }],
  ["path", { d: "M15 11v2", key: "i11awn" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const qf = te("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const $f = te("ChevronUp", [
  ["path", { d: "m18 15-6-6-6 6", key: "153udz" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Gf = te("CircleCheckBig", [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Yi = te("CircleStop", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1", key: "1ssd4o" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ra = te("FilePenLine", [
  [
    "path",
    {
      d: "m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2",
      key: "142zxg",
    },
  ],
  [
    "path",
    {
      d: "M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",
      key: "2t3380",
    },
  ],
  ["path", { d: "M8 18h1", key: "13wk12" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Qi = te("Folder", [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      key: "1kt360",
    },
  ],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const jf = te("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  [
    "path",
    { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" },
  ],
  ["path", { d: "M2 12h20", key: "9i4pu4" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Wf = te("Image", [
  [
    "rect",
    {
      width: "18",
      height: "18",
      x: "3",
      y: "3",
      rx: "2",
      ry: "2",
      key: "1m3agn",
    },
  ],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ta = te("Instagram", [
  [
    "rect",
    {
      width: "20",
      height: "20",
      x: "2",
      y: "2",
      rx: "5",
      ry: "5",
      key: "2e1cvw",
    },
  ],
  [
    "path",
    { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "9exkf1" },
  ],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "r4j83e" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Xi = te("ListOrdered", [
  ["path", { d: "M10 12h11", key: "6m4ad9" }],
  ["path", { d: "M10 18h11", key: "11hvi2" }],
  ["path", { d: "M10 6h11", key: "c7qv1k" }],
  ["path", { d: "M4 10h2", key: "16xx2s" }],
  ["path", { d: "M4 6h1v4", key: "cnovpq" }],
  ["path", { d: "M6 18H4c0-1 2-2 2-3s-1-1.5-2-1", key: "m9a95d" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Vf = te("Loader", [
  ["path", { d: "M12 2v4", key: "3427ic" }],
  ["path", { d: "m16.2 7.8 2.9-2.9", key: "r700ao" }],
  ["path", { d: "M18 12h4", key: "wj9ykh" }],
  ["path", { d: "m16.2 16.2 2.9 2.9", key: "1bxg5t" }],
  ["path", { d: "M12 18v4", key: "jadmvz" }],
  ["path", { d: "m4.9 19.1 2.9-2.9", key: "bwix9q" }],
  ["path", { d: "M2 12h4", key: "j09sii" }],
  ["path", { d: "m4.9 4.9 2.9 2.9", key: "giyufr" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Hf = te("LogOut", [
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
  ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const zf = te("MessageCirclePlus", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }],
  ["path", { d: "M8 12h8", key: "1wcyev" }],
  ["path", { d: "M12 8v8", key: "napkw2" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Kf = te("MessageCircle", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Zi = te("Mic", [
  [
    "path",
    {
      d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",
      key: "131961",
    },
  ],
  ["path", { d: "M19 10v2a7 7 0 0 1-14 0v-2", key: "1vc78b" }],
  ["line", { x1: "12", x2: "12", y1: "19", y2: "22", key: "x3vr5v" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Jf = te("Minus", [["path", { d: "M5 12h14", key: "1ays0h" }]]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Yf = te("Moon", [
  ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "a7tn18" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Qf = te("NotepadText", [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M12 2v4", key: "3427ic" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  [
    "rect",
    { width: "16", height: "18", x: "4", y: "4", rx: "2", key: "1u9h20" },
  ],
  ["path", { d: "M8 10h6", key: "3oa6kw" }],
  ["path", { d: "M8 14h8", key: "1fgep2" }],
  ["path", { d: "M8 18h5", key: "17enja" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Xf = te("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu",
    },
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Zf = te("Play", [
  ["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const hn = te("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const eg = te("Power", [
  ["path", { d: "M12 2v10", key: "mnfbl" }],
  ["path", { d: "M18.4 6.6a9 9 0 1 1-12.77.04", key: "obofu9" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const tg = te("RefreshCcw", [
  [
    "path",
    { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "14sxne" },
  ],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  [
    "path",
    { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16", key: "1hlbsb" },
  ],
  ["path", { d: "M16 16h5v5", key: "ccwih5" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const rg = te("SendHorizontal", [
  [
    "path",
    {
      d: "M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z",
      key: "117uat",
    },
  ],
  ["path", { d: "M6 12h16", key: "s4cdu5" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ng = te("Send", [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3",
    },
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ig = te("SquareKanban", [
  [
    "rect",
    { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" },
  ],
  ["path", { d: "M8 7v7", key: "1x2jlm" }],
  ["path", { d: "M12 7v4", key: "xawao1" }],
  ["path", { d: "M16 7v9", key: "1hp2iy" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const og = te("Sun", [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ag = te("TicketPlus", [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
      key: "qn84l0",
    },
  ],
  ["path", { d: "M9 12h6", key: "1c52cq" }],
  ["path", { d: "M12 9v6", key: "199k2o" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const xt = te("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const sg = te("TypeOutline", [
  [
    "path",
    {
      d: "M14 16.5a.5.5 0 0 0 .5.5h.5a2 2 0 0 1 0 4H9a2 2 0 0 1 0-4h.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V8a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-4 0v-.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5Z",
      key: "1reda3",
    },
  ],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const lg = te("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const cg = te("Video", [
  [
    "path",
    {
      d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
      key: "ftymec",
    },
  ],
  [
    "rect",
    { x: "2", y: "6", width: "14", height: "12", rx: "2", key: "158x01" },
  ],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Gt = te("X", [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }],
  ]),
  S = (e) => {
    var t;
    return window.flowsiLan === "pt_BR"
      ? chrome.i18n.getMessage(e)
      : (t = window.languageMessages[e]) == null
        ? void 0
        : t.message;
  };
async function Zr(e, t, r) {
  if (!e) return Pt(t);
  const n = document.querySelector('[type="file"]');
  if (!n) {
    console.error("File input not found");
    return;
  }
  try {
    const o = await (await fetch(e)).blob();
    let a;
    const s = o.type.split("/")[1];
    o.type.startsWith("image/")
      ? (a = "image." + s)
      : o.type.startsWith("audio/")
        ? (a = "audio." + s)
        : (a = "file." + s);
    const u = new File([o], a, { type: o.type }),
      d = new DataTransfer();
    (d.items.add(u), (n.files = d.files));
    const c = new Event("change", { bubbles: !0 });
    (n.dispatchEvent(c),
      await new Promise((p) => setTimeout(p, 1e3)),
      Pt(t, !1),
      Y.success(S("image_uploaded_mg")));
  } catch (i) {
    (console.error("Error uploading image:", i),
      Y.error(S("image_upload_failed_mg")));
  }
}
function Pt(e, t = !0) {
  const r = document.querySelector('[contenteditable="true"]');
  if (!r)
    return setTimeout(() => {
      Pt(e, t);
    }, 300);
  (r.focus(), r.click());
  let n = new InputEvent("input", {
    data: e,
    view: window,
    bubbles: !0,
    cancelable: !0,
    composed: !0,
  });
  (r.dispatchEvent(n),
    r.focus(),
    r.click(),
    setTimeout(() => {
      let i = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: !0,
        cancelable: !0,
      });
      r.dispatchEvent(i);
    }, 50),
    t && Y.success(S("message_sent_mg")));
}
async function Ba(e) {
  const t = String(e || "").replace(/^@/, ""),
    r = encodeURIComponent(t),
    n = document.cookie
      .split(";")
      .map((c) => c.trim().split("="))
      .find((c) => c[0] === "csrftoken"),
    i = n && n[1] ? decodeURIComponent(n[1]) : "",
    o = [
      "https://www.instagram.com/api/v1/users/web_profile_info/?username=" + r,
      "https://i.instagram.com/api/v1/users/web_profile_info/?username=" + r,
    ];
  let a = null;
  const s = (c) => ({
    business_email: c.business_email,
    business_phone_number: c.business_phone_number,
    fbid: c.fbid,
    category: c.category_name || c.business_category_name,
    following:
      c.edge_follow &&
      c.edge_follow.count !== null &&
      c.edge_follow.count !== void 0 &&
      Number.isFinite(Number(c.edge_follow.count))
        ? Number(c.edge_follow.count)
        : null,
    followers: (c.edge_followed_by && c.edge_followed_by.count) || 0,
    posts:
      (c.edge_owner_to_timeline_media &&
        c.edge_owner_to_timeline_media.count) ||
      0,
    website: c.external_url,
    verified: c.is_verified,
    messageId: c.eimu_id,
    isFollow:
      typeof c.follows_viewer === "boolean" ? c.follows_viewer : null,
    photo: c.profile_pic_url,
    data: c,
  });
  for (const c of o)
    try {
      const p = await fetch(c, {
        headers: {
          accept: "*/*",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
          "content-type": "application/x-www-form-urlencoded",
          "x-ig-app-id": "936619743392459",
          "x-asbd-id": "129477",
          "x-csrftoken": i,
          "x-requested-with": "XMLHttpRequest",
        },
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      });
      if (!p.ok) throw new Error("Instagram respondeu HTTP " + p.status);
      const l = await p.json(),
        g = (l && l.data && l.data.user) || (l && l.user);
      if (!g) throw new Error("Perfil não retornado pelo Instagram");
      return s(g);
    } catch (c) {
      ((a = c), await new Promise((p) => setTimeout(p, 350)));
    }
  try {
    const c = await fetch("https://www.instagram.com/" + r + "/", {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!c.ok) throw new Error("Página do perfil respondeu HTTP " + c.status);
    const p = await c.text(),
      l = new DOMParser().parseFromString(p, "text/html"),
      g = l.querySelector('meta[property="og:title"]')?.content || "",
      h = l.querySelector('meta[property="og:description"]')?.content || "",
      y = l.querySelector('meta[property="og:image"]')?.content || "";
    let D = "",
      C = "";
    for (const w of l.querySelectorAll('script[type="application/ld+json"]'))
      try {
        const P = JSON.parse(w.textContent || "{}"),
          _ = (P && P.mainEntity) || P;
        ((D = D || (_ && _.name) || ""),
          (C =
            C ||
            (_ &&
              ((_.image && (_.image.url || _.image)) ||
                (_.primaryImageOfPage && _.primaryImageOfPage.contentUrl))) ||
            ""));
      } catch {}
    const w = g.split(/\s+\(@/)[0].trim(),
      P = (v) => {
        const _ = String(v || "")
            .trim()
            .toUpperCase(),
          N = _.endsWith("K") ? 1e3 : _.endsWith("M") ? 1e6 : 1,
          B = parseFloat(
            _.replace(/[^0-9,.]/g, "")
              .replace(N === 1 ? /[.,]/g : "", "")
              .replace(",", "."),
          );
        return Number.isFinite(B) ? Math.round(B * N) : null;
      },
      _ = (q) => {
        const m = h.match(q);
        return m ? P(m[1]) : null;
      },
      N = {
        id: t,
        username: t,
        full_name: D || (w && !/^instagram$/i.test(w)) ? D || w : t,
        profile_pic_url: C || y,
        edge_follow: {
          count: _(/([0-9.,]+\s*[KM]?)\s+(?:following|seguindo)/i),
        },
        edge_followed_by: {
          count: _(/([0-9.,]+\s*[KM]?)\s+(?:followers|seguidores)/i),
        },
        edge_owner_to_timeline_media: {
          count: _(/([0-9.,]+\s*[KM]?)\s+(?:posts|publica(?:ç|c)[õo]es)/i),
        },
        is_verified: false,
        follows_viewer: null,
      };
    if (N.full_name || N.profile_pic_url) return s(N);
  } catch (c) {
    a = c;
  }
  throw a || new Error("Não foi possível consultar o perfil no Instagram");
}
function eo(e) {
  return e < 1e3
    ? e.toString()
    : e < 1e6
      ? Math.floor(e / 1e3) + "K"
      : Math.floor(e / 1e6) + "M";
}
const dt = () => document.querySelector('main[role="main"]'),
  ug = () => {
    var e, t;
    return (t =
      (e = dt()) == null
        ? void 0
        : e.querySelector(
            "section > div > div > div > div > div:last-child > div > div > div > div > div:first-child",
          )) != null
      ? t
      : null;
  },
  dg = () => {
    var e, t;
    return (t =
      (e = ug()) == null
        ? void 0
        : e.querySelector(":scope > div:last-child > div > div")) != null
      ? t
      : null;
  },
  La = () => {
    var e, t;
    return (t =
      (e = dt()) == null ? void 0 : e.querySelector('a[href^="/"]')) != null
      ? t
      : null;
  },
  bn = () => {
    const e = La();
    return e ? new URL(e.href).pathname.split("/")[1] : null;
  },
  pg = () => {
    var e, t;
    return (t =
      (e = dt()) == null ? void 0 : e.querySelector("h2 span[title]")) != null
      ? t
      : null;
  },
  Fa = () => {
    var e, t;
    return (t =
      (e = dt()) == null
        ? void 0
        : e.querySelector(
            "section > div > div > div > div > div:last-child > div > div > div > div:last-child",
          )) != null
      ? t
      : null;
  },
  Ua = () => {
    var e, t;
    return (t =
      (e = Fa()) == null
        ? void 0
        : e.querySelector(":scope > :last-child > div > div > div > div")) !=
      null
      ? t
      : null;
  },
  qa = () => {
    var e, t;
    return (t =
      (e = Ua()) == null
        ? void 0
        : e.querySelector(":scope > div:last-child")) != null
      ? t
      : null;
  },
  fg = () => {
    var t;
    const e =
      (t = qa()) == null
        ? void 0
        : t.querySelector(
            ":scope > div:last-child > div > div > div > div:nth-child(3)",
          );
    return e != null ? e : null;
  },
  gg = () => document.querySelector(".flowsi-side-overlay-container"),
  $a = () => {
    var e, t;
    return (t =
      (e = dt()) == null
        ? void 0
        : e.querySelector(
            "section > div > div > div > div > div:last-child",
          )) != null
      ? t
      : null;
  },
  mg = () => {
    var e, t, r;
    return (r =
      (t = (e = $a()) == null ? void 0 : e.parentElement) == null
        ? void 0
        : t.querySelector("div")) != null
      ? r
      : null;
  };
function vg(e) {
  (Object.assign(e.style, {
    width: "750px",
    maxWidth: "750px",
    height: "80vh",
    position: "fixed",
    left: "45%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "8px",
    padding: "5px",
  }),
    e.classList.add("flowsi-chatbox-border"));
}
function hg(e) {
  (Object.assign(e.style, {
    width: "",
    maxWidth: "",
    height: "",
    position: "",
    left: "",
    top: "",
    transform: "",
    borderRadius: "",
    border: "",
    padding: "",
  }),
    e.classList.remove("flowsi-chatbox-border"));
}
async function flowsiOpenChatFromProfile_20261028(e, t) {
  e = String(e || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  let n = {},
    i = String(t || "").trim();
  if (!/^\d{10,}$/.test(i)) {
    const r = await new Promise((s) =>
      chrome.storage.local.get(["flowsiThreadByUsername"], s),
    );
    ((n = { ...(r.flowsiThreadByUsername || {}) }),
      (i = String(n[e] || "").trim()));
  }
  const o = async (s) => {
    const u = "/direct/t/" + encodeURIComponent(s) + "/";
    yg(u);
    const d = Date.now();
    for (; Date.now() - d < 8e3;) {
      await new Promise((c) => setTimeout(c, 120));
      const p = document.querySelector('main[role="main"]'),
        l = p == null ? void 0 : p.querySelector('[contenteditable="true"]'),
        g =
          p &&
          [...p.querySelectorAll("a[href]")].some((c) => {
            try {
              return (
                new URL(c.href, location.origin).pathname === "/" + e + "/"
              );
            } catch {
              return !1;
            }
          });
      if (l && g) return u;
      if (location.pathname !== u && Date.now() - d > 1200) return null;
    }
    return null;
  };
  if (/^\d{10,}$/.test(i)) {
    const s = await o(i);
    if (s) return s;
    (delete n[e], chrome.storage.local.set({ flowsiThreadByUsername: n }));
  }
  yg("/" + encodeURIComponent(e) + "/");
  const a = Date.now();
  let s = null;
  for (; Date.now() - a < 12e3;) {
    s = [...document.querySelectorAll("button,[role=button]")].find((u) => {
      const d = (u.textContent || "").replace(/\s+/g, " ").trim();
      return (d === "Enviar mensagem" || d === "Message") && !u.disabled;
    });
    if (s) break;
    await new Promise((u) => setTimeout(u, 250));
  }
  if (!s) throw new Error("Botão de mensagem não encontrado no perfil.");
  const u = [...document.querySelectorAll('a[href^="/direct/t/"]')].map(
    (d) => new URL(d.href, location.origin).pathname,
  );
  s.click();
  const d = Date.now();
  let c = null;
  for (; Date.now() - d < 15e3;) {
    const p = [...document.querySelectorAll('a[href^="/direct/t/"]')].map(
        (l) => new URL(l.href, location.origin).pathname,
      ),
      g = p.find((l) => !u.includes(l));
    if (g) {
      c = g;
      break;
    }
    if (location.pathname.startsWith("/direct/t/")) {
      c = location.pathname;
      break;
    }
    await new Promise((p) => setTimeout(p, 250));
  }
  if (!c) throw new Error("O Instagram não informou o endereço da conversa.");
  const p = c.match(/^\/direct\/t\/(\d+)/);
  if (!p) throw new Error("O Instagram retornou uma conversa inválida.");
  return (
    (n[e] = p[1]),
    chrome.storage.local.set({ flowsiThreadByUsername: n }),
    yg(c),
    c
  );
}
async function flowsiPresentDirectChatModal_20261028() {
  const e = Date.now();
  let t = null,
    r = null;
  for (; Date.now() - e < 12e3;) {
    ((t = document.querySelector('main[role="main"]')),
      (r = t == null ? void 0 : t.querySelector('[contenteditable="true"]')));
    if (t && r) break;
    await new Promise((s) => setTimeout(s, 250));
  }
  if (!t || !r)
    throw new Error("A conversa do Instagram não terminou de carregar.");
  const n = document.querySelector(".flowsi-overlay");
  if (!n) throw new Error("O Kanban não está disponível.");
  const i = document.querySelector(".flowsi-direct-chat-close-20261028");
  i && i.click();
  const o = [...t.querySelectorAll("input")].find((s) =>
    /pesquisar|search/i.test(
      [s.placeholder, s.getAttribute("aria-label")].filter(Boolean).join(" "),
    ),
  );
  let a = null,
    u = null,
    d = null;
  if (o) {
    for (d = r; d && d !== t && !d.contains(o);) d = d.parentElement;
    if (d && d.contains(o)) {
      for (a = r; a.parentElement && a.parentElement !== d;)
        a = a.parentElement;
      for (u = o; u.parentElement && u.parentElement !== d;)
        u = u.parentElement;
      a === u && ((a = null), (u = null));
    }
  }
  const c = new Map(),
    p = (s) => {
      s && !c.has(s) && c.set(s, s.getAttribute("style"));
    };
  (p(t), p(d), p(a), p(u), p(n));
  let v = t;
  for (; v.parentElement && v.parentElement !== document.body;) {
    const s = v.parentElement;
    (p(s),
      Object.assign(s.style, {
        position: "static",
        display: "block",
        width: "100%",
        maxWidth: "none",
        height: "100%",
        margin: "0",
        padding: "0",
        left: "0",
        right: "0",
        transform: "none",
        overflow: "visible",
        boxSizing: "border-box",
        background: "transparent",
        backgroundColor: "transparent",
        pointerEvents: "none",
      }));
    for (const m of s.children)
      m !== v &&
        (p(m),
        (m.style.visibility = "hidden"),
        (m.style.pointerEvents = "none"));
    v = s;
  }
  (Object.assign(v.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    pointerEvents: "none",
    background: "transparent",
  }),
    (n.style.zIndex = "1000"));
  const l = document.createElement("div");
  ((l.className = "flowsi-direct-chat-backdrop-20261028"),
    Object.assign(l.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(15, 23, 42, 0.16)",
      zIndex: "2147483645",
      pointerEvents: "none",
    }),
    document.body.appendChild(l),
    Object.assign(t.style, {
      position: "fixed",
      left: "calc(50% - 29px)",
      top: "50%",
      transform: "translate(-50%, -50%) scale(.76)",
      transformOrigin: "center center",
      width: "min(820px, calc(100vw - 72px))",
      maxWidth: "820px",
      height: "calc(100vh - 96px)",
      maxHeight: "calc(100vh - 96px)",
      margin: "0",
      padding: "0",
      background: "#fff",
      border: "1px solid #d1d5db",
      borderRadius: "16px",
      boxShadow: "0 24px 70px rgba(15, 23, 42, 0.32)",
      overflow: "hidden",
      clipPath: "inset(0 0 0 66px round 16px)",
      zIndex: "2147483646",
      boxSizing: "border-box",
      isolation: "isolate",
      visibility: "visible",
      pointerEvents: "auto",
    }),
    d &&
      d !== t &&
      Object.assign(d.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        maxWidth: "none",
        height: "100%",
        display: "block",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#fff",
        visibility: "visible",
        pointerEvents: "auto",
        zIndex: "2147483647",
      }),
    u && (u.style.display = "none"),
    a &&
      Object.assign(a.style, {
        display: "flex",
        position: "absolute",
        inset: "0",
        left: "0",
        right: "0",
        top: "0",
        bottom: "0",
        width: "100%",
        maxWidth: "none",
        height: "100%",
        flex: "1 1 auto",
        margin: "0",
        padding: "0 0 86px 0",
        boxSizing: "border-box",
        overflow: "hidden",
      }));
  let flowsiComposerBar_20261028 = r;
  for (
    ;
    flowsiComposerBar_20261028 &&
    flowsiComposerBar_20261028 !== a &&
    flowsiComposerBar_20261028.querySelectorAll("button,[role=button]").length <
      3;
  )
    flowsiComposerBar_20261028 = flowsiComposerBar_20261028.parentElement;
  if (flowsiComposerBar_20261028 && flowsiComposerBar_20261028 !== a) {
    (p(flowsiComposerBar_20261028),
      Object.assign(flowsiComposerBar_20261028.style, {
        position: "fixed",
        left: "8px",
        right: "8px",
        bottom: "20px",
        width: "auto",
        height: "52px",
        minHeight: "52px",
        maxHeight: "52px",
        margin: "0",
        padding: "8px 8px",
        overflow: "hidden",
        background: "#fff",
        backgroundColor: "#fff",
        border: "1px solid #dbdfe4",
        borderRadius: "24px",
        boxShadow: "none",
        boxSizing: "border-box",
        visibility: "visible",
        zIndex: "2147483647",
        alignItems: "center",
        pointerEvents: "auto",
      }),
      flowsiComposerBar_20261028
        .querySelectorAll("button,[role=button]")
        .forEach((flowsiComposerAction_20261028) => {
          (p(flowsiComposerAction_20261028),
            Object.assign(flowsiComposerAction_20261028.style, {
              alignSelf: "center",
              marginTop: "0",
              marginBottom: "0",
            }));
        }));
    (p(r),
      Object.assign(r.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        lineHeight: "18px",
        height: "18px",
        minHeight: "18px",
        maxHeight: "18px",
        width: "100%",
        flex: "1 1 auto",
        minWidth: "0",
        padding: "0",
        margin: "0",
        alignSelf: "center",
        boxSizing: "border-box",
        transform: "translateY(3px)",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        cursor: "text",
        pointerEvents: "auto",
      }));
    const flowsiComposerEditorWrap_20261028 = r.parentElement;
    flowsiComposerEditorWrap_20261028 &&
      (p(flowsiComposerEditorWrap_20261028),
      Object.assign(flowsiComposerEditorWrap_20261028.style, {
        display: "flex",
        alignItems: "center",
        alignSelf: "center",
        justifyContent: "flex-start",
        width: "auto",
        height: "100%",
        maxHeight: "100%",
        flex: "1 1 auto",
        minWidth: "0",
        overflow: "hidden",
        textAlign: "left",
        cursor: "text",
        pointerEvents: "auto",
      }));
    const flowsiAlignComposerPlaceholder_20261028 = () => {
      flowsiComposerBar_20261028
        .querySelectorAll("span,p,div")
        .forEach((flowsiPlaceholder_20261028) => {
          const flowsiPlaceholderText_20261028 = String(
            flowsiPlaceholder_20261028.textContent || "",
          )
            .replace(/\s+/g, " ")
            .trim();
          /^(mensagem|message)\s*\.{3}$/i.test(
            flowsiPlaceholderText_20261028,
          ) &&
            flowsiPlaceholder_20261028.children.length === 0 &&
            (p(flowsiPlaceholder_20261028),
            Object.assign(flowsiPlaceholder_20261028.style, {
              display: "flex",
              alignItems: "center",
              height: "18px",
              minHeight: "18px",
              maxHeight: "18px",
              lineHeight: "18px",
              margin: "0",
              padding: "0",
              transform: "translateY(5px)",
              boxSizing: "border-box",
            }));
        });
    };
    flowsiComposerBar_20261028.dataset.flowsiFocusBridge20261028 ||
      ((flowsiComposerBar_20261028.dataset.flowsiFocusBridge20261028 = "1"),
      flowsiComposerBar_20261028.addEventListener(
        "click",
        (flowsiComposerFocusEvent_20261028) => {
          flowsiComposerFocusEvent_20261028.target.closest(
            "button,[role=button]",
          ) || r.focus();
        },
      ));
    const flowsiSyncComposerActions_20261028 = () => {
      const flowsiTypedText_20261028 = String(
          r.innerText || r.textContent || "",
        )
          .replace(/\u200b/g, "")
          .trim(),
        flowsiHasTypedText_20261028 = flowsiTypedText_20261028.length > 0,
        flowsiQuickMessageButton_20261028 =
          flowsiComposerBar_20261028.querySelector(
            ".flowsi-quick-message-button",
          );
      (flowsiQuickMessageButton_20261028 &&
        (p(flowsiQuickMessageButton_20261028),
        (flowsiQuickMessageButton_20261028.style.display =
          flowsiHasTypedText_20261028 ? "none" : "")),
        flowsiHasTypedText_20261028 &&
          flowsiComposerBar_20261028
            .querySelectorAll("button,[role=button]")
            .forEach((flowsiSendCandidate_20261028) => {
              if (
                flowsiSendCandidate_20261028 ===
                flowsiQuickMessageButton_20261028
              )
                return;
              const flowsiSendIcon_20261028 =
                  flowsiSendCandidate_20261028.querySelector(
                    "[aria-label],img[alt]",
                  ),
                flowsiSendIconLabel_20261028 = flowsiSendIcon_20261028
                  ? flowsiSendIcon_20261028.getAttribute("aria-label") ||
                    flowsiSendIcon_20261028.getAttribute("alt") ||
                    ""
                  : "",
                flowsiSendLabel_20261028 = (
                  (flowsiSendCandidate_20261028.getAttribute("aria-label") ||
                    "") +
                  " " +
                  (flowsiSendCandidate_20261028.textContent || "") +
                  " " +
                  flowsiSendIconLabel_20261028
                )
                  .replace(/\s+/g, " ")
                  .trim();
              /(^|\s)(enviar|send)(\s|$)/i.test(flowsiSendLabel_20261028) &&
                (p(flowsiSendCandidate_20261028),
                flowsiSendCandidate_20261028.style.removeProperty("display"));
            }));
    };
    (window.__flowsiComposerObserver_20261028 &&
      window.__flowsiComposerObserver_20261028.disconnect(),
      (window.__flowsiComposerObserver_20261028 = new MutationObserver(() => {
        (flowsiSyncComposerActions_20261028(),
          flowsiAlignComposerPlaceholder_20261028());
      })),
      window.__flowsiComposerObserver_20261028.observe(
        flowsiComposerBar_20261028,
        { childList: !0, subtree: !0 },
      ),
      r.addEventListener("input", () =>
        setTimeout(() => {
          (flowsiSyncComposerActions_20261028(),
            flowsiAlignComposerPlaceholder_20261028());
        }, 0),
      ),
      flowsiSyncComposerActions_20261028(),
      flowsiAlignComposerPlaceholder_20261028());
    const flowsiComposerShell_20261028 =
      flowsiComposerBar_20261028.parentElement;
    flowsiComposerShell_20261028 &&
      flowsiComposerShell_20261028 !== a &&
      (p(flowsiComposerShell_20261028),
      Object.assign(flowsiComposerShell_20261028.style, {
        background: "transparent",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "0",
        boxShadow: "none",
        padding: "0",
        margin: "0",
        overflow: "visible",
      }));
    let flowsiOriginalRoundedShell_20261028 =
      flowsiComposerShell_20261028.parentElement;
    for (
      let flowsiRoundedDepth_20261028 = 0;
      flowsiOriginalRoundedShell_20261028 &&
      flowsiOriginalRoundedShell_20261028 !== a &&
      flowsiRoundedDepth_20261028 < 5;
      flowsiRoundedDepth_20261028++,
        flowsiOriginalRoundedShell_20261028 =
          flowsiOriginalRoundedShell_20261028.parentElement
    ) {
      const flowsiRoundedStyle_20261028 = getComputedStyle(
        flowsiOriginalRoundedShell_20261028,
      );
      if (
        parseFloat(flowsiRoundedStyle_20261028.borderTopWidth) > 0 &&
        parseFloat(flowsiRoundedStyle_20261028.borderRadius) > 0
      ) {
        (p(flowsiOriginalRoundedShell_20261028),
          Object.assign(flowsiOriginalRoundedShell_20261028.style, {
            background: "transparent",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "0",
            boxShadow: "none",
            padding: "0",
          }));
        break;
      }
    }
  }
  const f = document.createElement("button");
  ((f.type = "button"),
    (f.className = "flowsi-direct-chat-close-20261028"),
    f.setAttribute("aria-label", "Fechar conversa"),
    (f.textContent = "×"),
    Object.assign(f.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "34px",
      height: "34px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
      border: "1px solid #d1d5db",
      borderRadius: "999px",
      background: "#fff",
      color: "#111827",
      fontSize: "24px",
      lineHeight: "1",
      boxShadow: "0 3px 12px rgba(15, 23, 42, 0.16)",
      cursor: "pointer",
      zIndex: "2147483647",
    }));
  const flowsiPositionClose_20261028 = () => {
    const s = t.getBoundingClientRect();
    ((f.style.left = `${s.right - 12}px`), (f.style.top = `${s.top - 18}px`));
  };
  (document.body.appendChild(f),
    flowsiPositionClose_20261028(),
    window.addEventListener("resize", flowsiPositionClose_20261028));
  const g = () => {
      (window.removeEventListener("resize", flowsiPositionClose_20261028),
        document.removeEventListener("keydown", h));
      for (const [s, m] of c)
        m === null ? s.removeAttribute("style") : s.setAttribute("style", m);
      ((n.style.zIndex = "1000"), f.remove(), l.remove());
    },
    h = (s) => {
      s.key === "Escape" && g();
    };
  return (
    f.addEventListener("click", g),
    document.addEventListener("keydown", h),
    !0
  );
}
async function flowsiSyncProfilePhotoFromChat_20261028(e) {
  const t = "/" + e + "/",
    r = Date.now();
  let n = "";
  for (; Date.now() - r < 6e3 && !n;) {
    const i = document.querySelector('main[role="main"]'),
      o =
        i &&
        [...i.querySelectorAll("a[href]")].find((a) => {
          try {
            return new URL(a.href, location.origin).pathname === t;
          } catch {
            return !1;
          }
        });
    let a =
      i &&
      [...i.querySelectorAll("img")].find((s) => {
        const u = (s.currentSrc || s.src || "").trim(),
          d = (s.alt || "").toLowerCase();
        return /^https?:/i.test(u) && d.includes(e.toLowerCase());
      });
    if (!a && o) {
      let s = o;
      for (let u = 0; s && u < 5 && !a; u++, s = s.parentElement)
        a = [...s.querySelectorAll("img")].find((d) =>
          /^https?:/i.test((d.currentSrc || d.src || "").trim()),
        );
    }
    ((n = a ? (a.currentSrc || a.src || "").trim() : ""),
      n.includes("ig-logo") && (n = ""),
      n || (await new Promise((s) => setTimeout(s, 160))));
  }
  if (!n) return !1;
  const i = { username: e, profileImage: n };
  (window.flowsiActiveChatProfile_20261028 &&
    window.flowsiActiveChatProfile_20261028.username === e &&
    ((window.flowsiActiveChatProfile_20261028 = {
      ...window.flowsiActiveChatProfile_20261028,
      profileImage: n,
      profile_pic_url: n,
    }),
    chrome.storage.local.set({
      flowsiActiveChatProfile: window.flowsiActiveChatProfile_20261028,
    })),
    window.flowsiOpenNotebookProfile &&
      window.flowsiOpenNotebookProfile.username === e &&
      ((window.flowsiOpenNotebookProfile = {
        ...window.flowsiOpenNotebookProfile,
        profileImage: n,
        profile_pic_url: n,
      }),
      chrome.storage.local.set({
        openNotebookProfile: window.flowsiOpenNotebookProfile,
      })),
    window.dispatchEvent(
      new CustomEvent("flowsi-profile-photo-updated-20261028", { detail: i }),
    ),
    chrome.storage.local.get(
      ["contactList", "kanbanColumns"],
      ({ contactList: o = [], kanbanColumns: a = [] }) => {
        const s = (u) =>
            u && u.username === e
              ? { ...u, profileImage: n, profile_pic_url: n }
              : u,
          d = o.map(s),
          c = a.map((u) => ({
            ...u,
            profiles: Array.isArray(u.profiles) ? u.profiles.map(s) : [],
          }));
        (chrome.storage.local.set({ contactList: d }),
          chrome.runtime.sendMessage({
            action: "flowsiCrmMutate",
            mutation: "updateProfilePhoto",
            username: e,
            profileImage: n,
          }));
      },
    ));
  return !0;
}
function flowsiShowChatOpening_20261028(e) {
  const t = document.querySelector(".flowsi-chat-opening-20261028");
  t && t.remove();
  const r = document.createElement("div"),
    n = document.createElement("div"),
    i = document.createElement("div"),
    o = document.createElement("strong"),
    a = document.createElement("span");
  ((r.className = "flowsi-chat-opening-20261028"),
    Object.assign(r.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(15, 23, 42, 0.16)",
      zIndex: "2147483647",
    }),
    Object.assign(n.style, {
      width: "min(430px, calc(100vw - 48px))",
      minHeight: "150px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      padding: "24px",
      border: "1px solid #d1d5db",
      borderRadius: "16px",
      background: "#fff",
      boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
      fontFamily: "Arial, sans-serif",
      color: "#111827",
    }),
    Object.assign(i.style, {
      fontSize: "24px",
      fontWeight: "700",
      letterSpacing: "6px",
      color: "#4f46e5",
    }),
    (i.textContent = "•••"),
    (o.textContent = e || "Instagram"),
    (a.textContent = "Abrindo conversa..."),
    (a.style.fontSize = "13px"),
    (a.style.color = "#64748b"),
    n.append(i, o, a),
    r.appendChild(n),
    document.body.appendChild(r));
  return () => r.remove();
}
function bg({
  profile: e,
  index: t,
  column: r,
  onDelete: n,
  setActiveOverlay: i,
  zoomLevel: o,
  unread: a,
}) {
  const [s, u] = x.exports.useState(!1),
    [d, c] = x.exports.useState(!1),
    [v, b] = x.exports.useState("");
  x.exports.useEffect(() => {
    const h = (y) => {
      var D;
      ((D = y.detail) == null ? void 0 : D.username) === e.username &&
        (b(y.detail.profileImage || ""), c(!1));
    };
    return (
      window.addEventListener("flowsi-profile-photo-updated-20261028", h),
      () =>
        window.removeEventListener("flowsi-profile-photo-updated-20261028", h)
    );
  }, [e.username]);
  const p = () => {
      c(!0);
    },
    l = async () => {
      if (s) return;
      const flowsiActiveChatProfile_20261028 = {
        ...e,
        notebookId: e.notebookId || e.profileId || e.userId || e.username,
        full_name: e.full_name || e.name || e.username,
        profile_pic_url: e.profileImage || e.profile_pic_url || "",
      };
      ((window.flowsiActiveChatProfile_20261028 =
        flowsiActiveChatProfile_20261028),
        chrome.storage.local.set({
          flowsiActiveChatProfile: flowsiActiveChatProfile_20261028,
        }),
        u(!0));
      const h = flowsiShowChatOpening_20261028(e.name || e.username);
      try {
        (await flowsiOpenChatFromProfile_20261028(
          e.username,
          e.threadId,
        ),
          flowsiSyncProfilePhotoFromChat_20261028(e.username),
          await flowsiPresentDirectChatModal_20261028());
      } catch (y) {
        (console.error("[Flowsi] Falha ao abrir chat:", y),
          Y.error("Não foi possível abrir esta conversa."));
      } finally {
        (h(), u(!1));
      }
    },
    g = (h) => {
      h && (h.preventDefault(), h.stopPropagation());
      const flowsiNotebookCardProfile_20261028 = {
        ...e,
        notebookId: e.notebookId || e.profileId || e.userId || e.username,
        full_name: e.full_name || e.name || e.username,
        profile_pic_url: e.profileImage || e.profile_pic_url || "",
      };
      ((window.flowsiOpenNotebook = e.username),
        (window.flowsiOpenNotebookProfile = flowsiNotebookCardProfile_20261028),
        i("notebook"),
        chrome.storage.local.set({
          openNotebook: e.username,
          openNotebookProfile: flowsiNotebookCardProfile_20261028,
        }));
    };
  return f(Ce, {
    children: f(fr, {
      draggableId: e.id,
      index: t,
      children: (h, y) => {
        var D, C;
        return I("div", {
          ref: h.innerRef,
          ...h.draggableProps,
          ...h.dragHandleProps,
          className: `flowsi-profile flowsi-magic-card ${y.isDragging ? "flowsi-dragging" : ""}`,
          children: [
            I("div", {
              className: "flowsi-profile-header",
              onClick: l,
              children: [
                f("img", {
                  src: d
                    ? chrome.runtime.getURL("/ig-logo.png")
                    : "https://cdn.getwebooster.workers.dev/" +
                      (v || e.profileImage),
                  alt: e.name || "Profile",
                  onError: p,
                  style:
                    o !== 100
                      ? {
                          width: `${(o / 100) * 3}rem`,
                          height: `${(o / 100) * 3}rem`,
                        }
                      : {},
                  className: "flowsi-profile-image",
                }),
                I("div", {
                  style: { overflow: "hidden" },
                  children: [
                    f("h3", {
                      className: "flowsi-profile-name",
                      children:
                        ((D = e == null ? void 0 : e.name) == null
                          ? void 0
                          : D.length) > 21
                          ? `${(C = e == null ? void 0 : e.name) == null ? void 0 : C.slice(0, 18)}...`
                          : e == null
                            ? void 0
                            : e.name,
                    }),
                    I("p", {
                      className: "flowsi-profile-username",
                      style: {
                        display: "flex",
                        justifyItems: "space-between",
                        alignItems: "center",
                      },
                      children: [
                        "@",
                        e.username,
                        a && f("span", { className: "flowsi-unread-tick" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            I("div", {
              className: "flowsi-profile-actions",
              children: [
                r.id !== "all-chats" &&
                  I("button", {
                    className:
                      "flowsi-quick-btn flowsi-quick-delete-btn  flowsi-tooltip-parent",
                    onClick: () => n(e.id),
                    children: [
                      I("svg", {
                        stroke: "currentColor",
                        fill: "currentColor",
                        strokeWidth: "0",
                        viewBox: "0 0 24 24",
                        height: "1em",
                        width: "1em",
                        xmlns: "http://www.w3.org/2000/svg",
                        children: [
                          f("path", { fill: "none", d: "M0 0h24v24H0V0z" }),
                          f("path", {
                            d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z",
                          }),
                        ],
                      }),
                      f("span", {
                        className: "flowsi-tooltip-child",
                        children: S("remove_text"),
                      }),
                    ],
                  }),
                I("button", {
                  type: "button",
                  onMouseDown: (h) => h.stopPropagation(),
                  onClick: (h) => g(h),
                  className: "flowsi-quick-btn  flowsi-tooltip-parent",
                  children: [
                    I("svg", {
                      stroke: "currentColor",
                      fill: "currentColor",
                      strokeWidth: "0",
                      viewBox: "0 0 24 24",
                      height: "1em",
                      width: "1em",
                      xmlns: "http://www.w3.org/2000/svg",
                      children: [
                        f("path", { fill: "none", d: "M0 0h24v24H0z" }),
                        f("path", {
                          d: "M19 5v9h-5v5H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10l6-6V5c0-1.1-.9-2-2-2zm-7 11H7v-2h5v2zm5-4H7V8h10v2z",
                        }),
                      ],
                    }),
                    f("span", {
                      className: "flowsi-tooltip-child",
                      children: S("notes_text"),
                    }),
                  ],
                }),
                I("button", {
                  onClick: l,
                  className: "flowsi-quick-btn flowsi-tooltip-parent",
                  children: [
                    f(Kf, {}),
                    f("span", {
                      className: "flowsi-tooltip-child",
                      children: S("open_chat_text"),
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      },
    }),
  });
}
function yg(e) {
  history.pushState(null, "", e);
  const t = new PopStateEvent("popstate", { state: null });
  dispatchEvent(t);
}
const Ga = ({ isOpen: e, onClose: t, onConfirm: r, title: n }) => {
    const i = x.exports.useRef(null);
    return (
      x.exports.useEffect(() => {
        const a = (s) => {
          i.current && !i.current.contains(s.target) && t();
        };
        return (
          e && document.addEventListener("mousedown", a),
          () => {
            document.removeEventListener("mousedown", a);
          }
        );
      }, [e, t]),
      e
        ? f("div", {
            className: "modal-overlay",
            children: I("div", {
              className: "modal-content",
              ref: i,
              children: [
                f("h2", {
                  style: {
                    marginTop: "1rem",
                    marginBottom: "2.5rem",
                    lineHeight: "1.4",
                    fontWeight: "600",
                    fontSize: "1.25rem",
                  },
                  children: n,
                }),
                f("form", {
                  onSubmit: (a) => {
                    (a.preventDefault(), r(), t());
                  },
                  children: I("div", {
                    className: "modal-actions",
                    children: [
                      f("button", {
                        type: "button",
                        onClick: t,
                        children: S("cancel_text"),
                      }),
                      I("button", {
                        type: "submit",
                        children: ["   ", S("confirm_text")],
                      }),
                    ],
                  }),
                }),
              ],
            }),
          })
        : null
    );
  },
  wg = "flowsi",
  xg = "2026.06.08",
  Ig = "Flowsi",
  Sg = {
    build: "tsc --noEmit && vite build",
    "build:watch": "cross-env __DEV__=true vite build -w",
    "build:hmr": "rollup --config utils/reload/rollup.config.ts",
    wss: "node utils/reload/initReloadServer.js",
    dev: "npm run build:hmr && (run-p wss build:watch)",
    "zip:clean": "rimraf --glob 'release*.zip'",
    "zip:generate":
      "cross-env NODE_ENV=production PLUGIN_CLIENT=$npm_package_config_client node ./commands/zip.mjs",
    zip: "npm-run-all zip:clean build zip:generate",
  },
  Cg = "module",
  Eg = {
    "@types/react-beautiful-dnd": "^13.1.8",
    axios: "^1.7.7",
    dotenv: "^16.4.7",
    "idb-keyval": "^3.0.0",
    "lucide-react": "^0.453.0",
    nanoid: "^5.0.7",
    "paho-mqtt": "^1.1.0",
    react: "18.2.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "react-dom": "18.2.0",
    "react-hot-toast": "^2.4.1",
    "react-icons": "^5.3.0",
    zustand: "^5.0.0",
  },
  Dg = {
    "@rollup/plugin-typescript": "^8.5.0",
    "@testing-library/react": "13.4.0",
    "@types/chrome": "0.0.224",
    "@types/jest": "29.0.3",
    "@types/node": "18.15.11",
    "@types/react": "18.0.21",
    "@types/react-dom": "18.2.4",
    "@types/ws": "^8.5.4",
    "@typescript-eslint/eslint-plugin": "5.56.0",
    "@typescript-eslint/parser": "5.38.1",
    "@vitejs/plugin-react": "2.2.0",
    autoprefixer: "^10.4.14",
    chokidar: "^3.5.3",
    "cross-env": "^7.0.3",
    eslint: "8.36.0",
    "eslint-config-prettier": "^8.5.0",
    "eslint-plugin-prettier": "4.2.1",
    "eslint-plugin-react": "7.32.2",
    "fs-extra": "11.1.0",
    jest: "29.0.3",
    "jest-environment-jsdom": "29.5.0",
    "npm-run-all": "^4.1.5",
    postcss: "^8.4.24",
    prettier: "2.8.8",
    rollup: "2.79.1",
    sass: "1.62.1",
    tailwindcss: "^3.3.2",
    "ts-jest": "29.0.2",
    "ts-loader": "9.4.2",
    typescript: "4.8.3",
    vite: "3.1.3",
    ws: "8.13.0",
    "zip-cli": "^0.0.0",
  },
  _g = {
    name: wg,
    version: xg,
    description: Ig,
    scripts: Sg,
    type: Cg,
    dependencies: Eg,
    devDependencies: Dg,
  },
  ja = {
    manifest_version: 3,
    version: _g.version,
    name: "__MSG_extension_name__",
    description: "__MSG_extension_description__",
    wClientId: "Ev5CCAg60HbGVWX77nCsV",
    appWebsite: "https://instaplus.segsmartwebplus.com.br/",
    appCheckout: "https://clkdmg.site/subscribe/segsmart-ins",
    appInstagram: "https://www.instagram.com/segsmartbrasil/",
    appContactPhone: "http://wa.me/554491654385",
    BASE_URL: "https://api.flowsi.com.br",
    default_locale: "pt_BR",
    background: {
      service_worker: "src/pages/background/index.js",
      type: "module",
    },
    action: {
      default_popup: "src/pages/popup/index.html",
      default_icon: "icon.png",
    },
    icons: { 128: "icon.png" },
    content_scripts: [
      {
        matches: ["https://www.instagram.com/*"],
        js: ["src/pages/content/index.js"],
        css: ["assets/css/contentStyle<KEY>.chunk.css"],
      },
    ],
    web_accessible_resources: [
      {
        resources: [
          "assets/js/*.js",
          "assets/css/*.css",
          "icon.png",
          "ig-logo.png",
          "_locales/others/*",
        ],
        matches: ["https://www.instagram.com/*"],
      },
    ],
    permissions: [
      "storage",
      "cookies",
      "tabs",
      "alarms",
      "declarativeNetRequest",
      "identity",
      "activeTab",
    ],
    host_permissions: ["*://*.instagram.com/*"],
    declarative_net_request: {
      rule_resources: [
        { id: "ruleset_1", enabled: !0, path: "rules/rule.json" },
      ],
    },
    oauth2: {
      client_id:
        "770703967278-1n61s77giut2qsen3sl21m71du3o382f.apps.googleusercontent.com",
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
    },
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAttgS0srQUD8HEK4LReL/jA9rVAWlJrcpYxsACPXkTsvlR1JA9IB7E1ZOGTZlLOdJ4iKsGZISojIaAbFg4EvhjIwQRHgPz20Mta42X5vvkdc+kullowa/u0lPc2FNUctseHwM6KARhbTawZgFEQ2eN+omzXEfdRgBzVFejdyxh8oH4rkS1IBppFSftbYcF7OldOasOyGhRB2zlyYF7VU3+fZMPu3ilRDS2QWXZ60U1JOn9Cut6JIjX4oUrx+x16V6yfug4PwZs79VojngVP1Rr0HfzD/73fZkZL24OxgKn+yoKihSrUFgfb2Pw0jywG8pewrGhvWTDjM+MiwgPo327QIDAQAB",
  },
  He = async () => !0;
function Ng(e) {
  return new Promise((t) => setTimeout(t, e));
}
const Wa = ({
  isOpen: e,
  onClose: t,
  onAdd: r,
  title: n,
  placeHolder: i,
  buttonText: o,
}) => {
  const [a, s] = x.exports.useState(""),
    u = x.exports.useRef(null);
  return (
    x.exports.useEffect(() => {
      He();
      const c = (p) => {
        u.current && !u.current.contains(p.target) && t();
      };
      return (
        e && document.addEventListener("mousedown", c),
        () => {
          document.removeEventListener("mousedown", c);
        }
      );
    }, [e, t]),
    e
      ? f("div", {
          className: "modal-overlay",
          children: I("div", {
            className: "modal-content",
            ref: u,
            children: [
              f("h2", { children: n }),
              I("form", {
                onSubmit: (c) => {
                  (c.preventDefault(), r(a), s(""));
                },
                children: [
                  f("input", {
                    autoFocus: !0,
                    type: "text",
                    value: a,
                    onChange: (c) => s(c.target.value),
                    placeholder: i,
                    required: !0,
                  }),
                  I("div", {
                    className: "modal-actions",
                    children: [
                      f("button", {
                        type: "button",
                        onClick: t,
                        children: S("cancel_text"),
                      }),
                      f("button", { type: "submit", children: o }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        })
      : null
  );
};
function Pg() {
  const e = document.querySelector(
      '.x1n2onr6>div>div[class="x13dflua x19991ni"]',
    ),
    t = [],
    r = e == null ? void 0 : e.closest(".x1n2onr6");
  return (
    r &&
      Array.from(r.children).forEach((n) => {
        var i;
        if (
          n instanceof HTMLElement &&
          !n.getAttribute("class") &&
          n.querySelector(
            "span.x6s0dn4.xzolkzo.x12go9s9.x1rnf11y.xprq8jg.x9f619.x3nfvp2.xl56j7k.x1tu34mt.xdk7pt.x1xc55vz.x1emribx",
          )
        ) {
          const o =
            (i = n.querySelector(
              "span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft",
            )) == null
              ? void 0
              : i.textContent;
          o && t.push(o);
        }
      }),
    t
  );
}
function kg({
  column: e,
  onDelete: t,
  deleteColumn: r,
  updateColumnName: n,
  dragHandleProps: i,
  setActiveOverlay: o,
  zoomLevel: a,
  updateKanbanInfo: s,
}) {
  const [u, d] = ce.useState(!1),
    [c, p] = ce.useState(!1),
    [flowsiSearchOpen_20261029, flowsiSetSearchOpen_20261029] =
      ce.useState(!1),
    [flowsiSearchQuery_20261029, flowsiSetSearchQuery_20261029] =
      ce.useState(""),
    l = Pg(),
    g = () => {
      d(!0);
    },
    h = () => {
      r(e);
    },
    y = () => {
      d(!1);
    },
    D = () => {
      p(!1);
    },
    C = (w) => {
      (n(e.id, w), p(!1));
    };
  const flowsiNormalizeSearch_20261029 = (w) =>
      String(w || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/^@+/, ""),
    flowsiNormalizedQuery_20261029 = flowsiNormalizeSearch_20261029(
      flowsiSearchQuery_20261029,
    ),
    flowsiVisibleProfiles_20261029 =
      e.id === "all-chats" && flowsiNormalizedQuery_20261029
        ? e.profiles.filter((w) =>
            [w.name, w.full_name, w.username]
              .map(flowsiNormalizeSearch_20261029)
              .some((P) => P.includes(flowsiNormalizedQuery_20261029)),
          )
        : e.profiles;
  return I("div", {
    className: "flowsi-column",
    style: a !== 100 ? { width: `${(a / 100) * 280}px` } : {},
    children: [
      f(Ga, { onConfirm: h, title: S("delete_column"), isOpen: u, onClose: y }),
      f(Wa, {
        title: S("rename_column") + e.title,
        placeHolder: S("updated_column_name"),
        buttonText: S("update_text"),
        onAdd: C,
        isOpen: c,
        onClose: D,
      }),
      I("div", {
        className: "flowsi-column-header",
        ...i,
        children: [
          I("div", {
            className: "flowsi-column-sub-header",
            children: [
              f("h2", { className: "flowsi-column-title", children: e.title }),
              e.id === "all-chats" &&
                f("button", {
                  type: "button",
                  className: "flowsi-kanban-search-toggle",
                  title: "Pesquisar contatos",
                  "aria-label": "Pesquisar contatos",
                  "aria-pressed": flowsiSearchOpen_20261029,
                  onMouseDown: (w) => w.stopPropagation(),
                  onClick: () => {
                    flowsiSetSearchOpen_20261029((w) => !w);
                    if (flowsiSearchOpen_20261029)
                      flowsiSetSearchQuery_20261029("");
                  },
                  style: {
                    width: "24px",
                    height: "24px",
                    minWidth: "24px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0",
                    marginLeft: "auto",
                    border: "0",
                    borderRadius: "5px",
                    background: flowsiSearchOpen_20261029
                      ? "var(--primary)"
                      : "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    outline: "none",
                    boxShadow: "none",
                  },
                  children: I("svg", {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "18",
                    height: "18",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    "aria-hidden": "true",
                    children: [
                      f("circle", { cx: "11", cy: "11", r: "8" }),
                      f("path", { d: "m21 21-4.3-4.3" }),
                    ],
                  }),
                }),
              e.id === "all-chats" &&
                f("button", {
                  type: "button",
                  className: "flowsi-kanban-refresh-trigger",
                  title: S("load_more_text"),
                  "aria-label": S("load_more_text"),
                  onMouseDown: (w) => w.stopPropagation(),
                  onClick: () => {
                    s(!0);
                  },
                  style: {
                    width: "24px",
                    height: "24px",
                    minWidth: "24px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0",
                    marginLeft: "6px",
                    border: "0",
                    borderRadius: "0",
                    background: "transparent",
                    color: "#000",
                    cursor: "pointer",
                    outline: "none",
                    boxShadow: "none",
                  },
                  children: I("svg", {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "18",
                    height: "18",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    "aria-hidden": "true",
                    children: [
                      f("path", { d: "M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" }),
                      f("path", {
                        d: "M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5",
                      }),
                    ],
                  }),
                }),
              e.id !== "all-chats" &&
                I("div", {
                  children: [
                    I("button", {
                      style: { marginRight: "10px" },
                      onClick: () => p(!0),
                      className:
                        "flowsi-quick-delete-btn  flowsi-tooltip-parent-bottom",
                      children: [
                        f(Ra, {}),
                        f("span", {
                          className: "flowsi-tooltip-child-bottom",
                          children: S("edit_label_text"),
                        }),
                      ],
                    }),
                    I("button", {
                      onClick: g,
                      className:
                        "flowsi-quick-delete-btn  flowsi-tooltip-parent-bottom",
                      children: [
                        f(xt, {}),
                        f("span", {
                          className: "flowsi-tooltip-child-bottom",
                          children: S("delete_label_text"),
                        }),
                      ],
                    }),
                  ],
                }),
            ],
          }),
          e.id === "all-chats" &&
            flowsiSearchOpen_20261029 &&
            f("input", {
              type: "search",
              value: flowsiSearchQuery_20261029,
              autoFocus: !0,
              placeholder: "Pesquisar por nome ou @",
              "aria-label": "Pesquisar contatos por nome ou @",
              onChange: (w) => flowsiSetSearchQuery_20261029(w.target.value),
              onMouseDown: (w) => w.stopPropagation(),
              style: {
                width: "calc(100% + 24px)",
                boxSizing: "border-box",
                margin: "4px -12px 8px",
                padding: "8px 10px",
                border: "1px solid var(--primary)",
                borderRadius: "8px",
                background: "var(--background-color-main)",
                color: "var(--text)",
                fontSize: "13px",
                outline: "none",
              },
            }),
          e.id !== "all-chats" &&
            I("p", {
              style: { margin: "0" },
              children: [e.profiles.length, " items"],
            }),
        ],
      }),
      f(Nt, {
        droppableId: e.id,
        children: (w) =>
          I("div", {
            ...w.droppableProps,
            ref: w.innerRef,
            className: "flowsi-profile-list",
            children: [
              flowsiVisibleProfiles_20261029.map((P, _) =>
                f(Ce, {
                  children: f(
                    bg,
                    {
                      profile: P,
                      index: _,
                      column: e,
                      onDelete: t,
                      setActiveOverlay: o,
                      zoomLevel: a,
                      unread: l.includes(P.name),
                    },
                    P.id,
                  ),
                }),
              ),
              e.id === "all-chats" &&
                flowsiNormalizedQuery_20261029 &&
                flowsiVisibleProfiles_20261029.length === 0 &&
                f("p", {
                  style: {
                    margin: "12px 4px 18px",
                    color: "var(--text)",
                    fontSize: "13px",
                    textAlign: "center",
                    opacity: ".72",
                  },
                  children: "Nenhum contato encontrado.",
                }),
              w.placeholder,
              e.id === "all-chats" &&
                f("button", {
                  type: "button",
                  className: "flowsi-load-more-contacts-btn",
                  onMouseDown: (P) => P.stopPropagation(),
                  onClick: () => s(!0),
                  style: {
                    width: "100%",
                    minHeight: "42px",
                    margin: "4px 0 14px",
                    padding: "10px 14px",
                    border: "1px solid var(--primary)",
                    borderRadius: "10px",
                    background: "var(--text)",
                    color: "var(--background-color-main)",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px var(--box-shadow)",
                  },
                  children: "Carregar mais contatos",
                }),
            ],
          }),
      }),
    ],
  });
}
const Va = () => null,
  Ha = () => {
    const t =
        "https://clkdmg.site/subscribe/9e362274-c8bf-433f-8d6a-c7052782df93",
      r = () => {
        window.open(t, "_blank");
      };
    return I("div", {
      className: "flowsi-pro-card",
      children: [
        f("h2", {
          className: "flowsi-pro-title",
          children: S("get_pro_title"),
        }),
        f("p", {
          className: "flowsi-pro-description",
          children: S("get_pro_description"),
        }),
        I("ul", {
          className: "flowsi-pro-features",
          children: [
            I("li", {
              className: "flowsi-pro-feature",
              children: [
                f("span", {
                  className: "flowsi-pro-checkmark",
                  children: "\u2713",
                }),
                S("get_pro_feature_1"),
              ],
            }),
            I("li", {
              className: "flowsi-pro-feature",
              children: [
                f("span", {
                  className: "flowsi-pro-checkmark",
                  children: "\u2713",
                }),
                S("get_pro_feature_2"),
              ],
            }),
            I("li", {
              className: "flowsi-pro-feature",
              children: [
                f("span", {
                  className: "flowsi-pro-checkmark",
                  children: "\u2713",
                }),
                S("get_pro_feature_3"),
              ],
            }),
            I("li", {
              className: "flowsi-pro-feature",
              children: [
                f("span", {
                  className: "flowsi-pro-checkmark",
                  children: "\u2713",
                }),
                S("get_pro_feature_4"),
              ],
            }),
          ],
        }),
        f("button", {
          onClick: r,
          className: "flowsi-pro-button",
          children: S("upgrade_to_premium_text"),
        }),
      ],
    });
  },
  Br = ({ open: e, onClose: t, message: r }) =>
    e
      ? f("div", {
          className: "flowsi-login-box-container",
          style: { zIndex: "99999" },
          children: I("div", {
            className: "flowsi-login-box",
            children: [
              f("button", {
                className: "flowsi-login-close-btn",
                onClick: t,
                children: f(Gt, {}),
              }),
              f("p", {
                style: {
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color: "red",
                  lineHeight: "23px",
                },
                children: r,
              }),
              f(Ha, {}),
            ],
          }),
        })
      : null;
function Mg({ setActiveOverlay: e, updateKanbanColumn: t }) {
  const [r, n] = x.exports.useState([]),
    [i, o] = x.exports.useState(!1),
    [a, s] = x.exports.useState("free"),
    [u, d] = x.exports.useState(100),
    [c, p] = x.exports.useState(!0),
    [l, g] = x.exports.useState(!1),
    [h, y] = x.exports.useState(""),
    [flowsiManualOpen_20261028, flowsiSetManualOpen_20261028] =
      x.exports.useState(!1),
    [flowsiManualBusy_20261028, flowsiSetManualBusy_20261028] =
      x.exports.useState(!1);
  const D = () => {
      d((k) => {
        const O = Math.min(k + 10, 200);
        return (
          chrome.storage.local.set({ kanbanZoomLevel: O }),
          Y.success(`Zoomed in to ${O}%`),
          O
        );
      });
    },
    C = () => {
      d((k) => {
        const O = Math.max(k - 10, 60);
        return (
          chrome.storage.local.set({ kanbanZoomLevel: O }),
          Y.success(`Zoomed out to ${O}%`),
          O
        );
      });
    };
  x.exports.useEffect(() => {
    (s("local"), p(!0), P());
  }, [t]);
  function w(k = !1) {
    p(!0);
    if (k) {
      document.documentElement.setAttribute(
        "data-flowsi-kanban-inbox-sync",
        "loading-more",
      );
      document.documentElement.setAttribute(
        "data-flowsi-inbox-diagnostics",
        JSON.stringify({ phase: "loading-more", processed: 0 }),
      );
    }
    const q = new Promise((m, v) => {
      let b = !1;
      const E = setTimeout(() => {
        b ||
          ((b = !0),
          v(new Error("A atualização demorou mais que o esperado.")));
      }, 3e4);
      chrome.runtime.sendMessage(
        {
          action: "updateThreadList",
          cursor: k ? "flowsi-dom-more" : null,
          apiOnly: !0,
        },
        (R) => {
          if (b) return;
          ((b = !0), clearTimeout(E));
          if (chrome.runtime.lastError) {
            v(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (R && R.success) {
            if (k) {
              document.documentElement.setAttribute(
                "data-flowsi-inbox-diagnostics",
                JSON.stringify({
                  phase: "loading-more-complete",
                  processed: Number(R.count || 0),
                }),
              );
              document.documentElement.setAttribute(
                "data-flowsi-kanban-inbox-sync",
                "complete",
              );
            }
            m(R);
          } else {
            if (k)
              document.documentElement.setAttribute(
                "data-flowsi-kanban-inbox-sync",
                "error:load-more",
              );
            v(new Error((R && R.error) || "Failed to update thread list"));
          }
        },
      );
    });
    Y.promise(q, {
      loading: S("checking_for_kanban_updates"),
      success: S("kanban_updates_available"),
      error: S("failed_to_update_kanban_updates"),
    }, {
      loading: { duration: 2e3 },
    })
      .then(() => {
        P();
      })
      .catch(() => {
        if (k)
          document.documentElement.setAttribute(
            "data-flowsi-kanban-inbox-sync",
            "error:load-more",
          );
        P();
      });
  }
  x.exports.useEffect(() => {}, []);
  function P() {
    chrome.storage.local.get(
      [
        "kanbanColumns",
        "contactList",
        "kanbanZoomLevel",
        "flowsiInstagramUsername",
        "flowsiInstagramUserId",
        "flowsiManualContacts",
        "flowsiKanbanAssignmentsV2",
      ],
      ({
        kanbanColumns: k = [],
        contactList: O = [],
        kanbanZoomLevel: q = 100,
        flowsiInstagramUsername: flowsiStoredSelfUsername_20261028 = "",
        flowsiInstagramUserId: flowsiStoredSelfId_20261028 = "",
        flowsiManualContacts: flowsiManualContacts_20261028 = [],
        flowsiKanbanAssignmentsV2: flowsiAssignments_20261028 = {},
      }) => {
        d(q);
        const flowsiCardKey_20261028 = (E) =>
            String(
              (E && E.username) ||
                (E && E.messageId) ||
                (E && E.name) ||
                (E && E.id) ||
                "",
            )
              .trim()
              .toLowerCase()
              .replace(/^@+/, "")
              .replace(/\s+/g, ""),
          flowsiContactsMap_20261028 = new Map();
        [
          ...(Array.isArray(flowsiManualContacts_20261028)
            ? flowsiManualContacts_20261028
            : []),
          ...(Array.isArray(O) ? O : []),
        ].forEach((E) => {
          const R = flowsiCardKey_20261028(E);
          R &&
            flowsiContactsMap_20261028.set(R, {
              ...flowsiContactsMap_20261028.get(R),
              ...E,
            });
        });
        const flowsiContacts_20261028 = [
            ...flowsiContactsMap_20261028.values(),
          ],
          flowsiBaseColumns_20261028 = k.length
            ? k
            : [
                {
                  id: "all-chats",
                  title: S("first_column_title"),
                  profiles: [],
                },
              ],
          flowsiAssignmentEntries_20261028 = Object.entries(
            flowsiAssignments_20261028 &&
              typeof flowsiAssignments_20261028 === "object"
              ? flowsiAssignments_20261028
              : {},
          ),
          flowsiAssignmentByKey_20261028 = new Map(
            flowsiAssignmentEntries_20261028,
          ),
          flowsiContactByKey_20261028 = new Map(
            flowsiContacts_20261028.map((E) => [flowsiCardKey_20261028(E), E]),
          );
        const flowsiCustomColumns_20261028 = flowsiBaseColumns_20261028
            .slice(1)
            .map((E) => {
              const R = [],
                T = new Set();
              for (const L of Array.isArray(E.profiles) ? E.profiles : []) {
                const j = flowsiCardKey_20261028(L),
                  $ = flowsiAssignmentByKey_20261028.get(j);
                if (!j || T.has(j) || ($ && $.columnId !== E.id)) continue;
                const K = flowsiContactByKey_20261028.get(j) || {};
                (R.push({ ...L, ...K, id: L.id || K.id || "crm-" + j }),
                  T.add(j));
              }
              for (const [j, $] of flowsiAssignmentEntries_20261028) {
                if (!$ || $.columnId !== E.id || T.has(j)) continue;
                const K = $.profile || {},
                  G = flowsiContactByKey_20261028.get(j) || {};
                (R.push({
                  ...K,
                  ...G,
                  username: K.username || G.username || j,
                  id: K.id || G.id || "crm-" + j,
                }),
                  T.add(j));
              }
              return { ...E, profiles: R };
            }),
          flowsiAssignedKeys_20261028 = new Set(
            flowsiCustomColumns_20261028.flatMap((E) =>
              (Array.isArray(E.profiles) ? E.profiles : []).map(
                flowsiCardKey_20261028,
              ),
            ),
          );
        const flowsiProfileIcon_20261028 = document.querySelector(
            'a[href] svg[aria-label="Perfil"],a[href] svg[aria-label="Profile"]',
          ),
          flowsiProfileLink_20261028 =
            flowsiProfileIcon_20261028 &&
            flowsiProfileIcon_20261028.closest("a[href]"),
          flowsiDomSelfUsername_20261028 = flowsiProfileLink_20261028
            ? (() => {
                try {
                  const E = new URL(
                    flowsiProfileLink_20261028.href,
                    location.origin,
                  ).pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
                  return E ? E[1] : "";
                } catch {
                  return "";
                }
              })()
            : "",
          flowsiSelfKey_20261028 = flowsiCardKey_20261028({
            username:
              flowsiStoredSelfUsername_20261028 ||
              flowsiDomSelfUsername_20261028,
          }),
          flowsiSelfId_20261028 = String(
            flowsiStoredSelfId_20261028 || "",
          ).trim(),
          flowsiIsSelf_20261028 = (E) =>
            !!(
              (flowsiSelfKey_20261028 &&
                flowsiCardKey_20261028(E) === flowsiSelfKey_20261028) ||
              (flowsiSelfId_20261028 &&
                [E.messageId, E.id, E.userId, E.pk].some(
                  (R) => String(R || "").trim() === flowsiSelfId_20261028,
                ))
            );
        const flowsiFirstColumn_20261028 = {
          ...flowsiBaseColumns_20261028[0],
          id: "all-chats",
          title: S("first_column_title"),
          profiles: flowsiContacts_20261028.filter(
            (E) =>
              !flowsiIsSelf_20261028(E) &&
              !flowsiAssignedKeys_20261028.has(flowsiCardKey_20261028(E)),
          ),
        };
        n([flowsiFirstColumn_20261028, ...flowsiCustomColumns_20261028]);
      },
    );
  }
  x.exports.useEffect(() => {
    const flowsiKanbanStorageListener_20261028 = (k, O) => {
      O === "local" &&
        [
          "contactList",
          "kanbanColumns",
          "flowsiManualContacts",
          "flowsiKanbanAssignmentsV2",
          "flowsiKanbanRevision",
        ].some((q) => k[q]) &&
        P();
    };
    return (
      chrome.storage.onChanged.addListener(
        flowsiKanbanStorageListener_20261028,
      ),
      () =>
        chrome.storage.onChanged.removeListener(
          flowsiKanbanStorageListener_20261028,
        )
    );
  }, []);
  const _ = (k) => {
      const {
        source: O,
        destination: q,
        type: m,
        draggableId: flowsiDraggedId_20261029,
      } = k;
      if (!q) return;
      if (m === "COLUMN") {
        if (O.index === 0 || q.index === 0)
          return Y.error(S("cannot_move_default_column_msg"));
        const v = Array.from(r),
          [b] = v.splice(O.index, 1);
        (v.splice(q.index, 0, b),
          n(v),
          chrome.storage.local.set({ kanbanColumns: v }));
        return;
      }
      const v = r.find((b) => b.id === O.droppableId),
        b = r.find((E) => E.id === q.droppableId),
        flowsiSourceIndex_20261029 =
          v && Array.isArray(v.profiles)
            ? v.profiles.findIndex(
                (R) => String(R.id) === String(flowsiDraggedId_20261029),
              )
            : -1,
        E =
          v && Array.isArray(v.profiles)
            ? v.profiles[
                flowsiSourceIndex_20261029 >= 0
                  ? flowsiSourceIndex_20261029
                  : O.index
              ]
            : null;
      if (!v || !b || !E) return;
      if (O.droppableId === q.droppableId && O.index === q.index) return;
      const flowsiOptimisticColumns_20261029 = r.map((R) => ({
          ...R,
          profiles: Array.isArray(R.profiles) ? [...R.profiles] : [],
        })),
        flowsiOptimisticSource_20261029 = flowsiOptimisticColumns_20261029.find(
          (R) => R.id === O.droppableId,
        ),
        flowsiOptimisticDestination_20261029 =
          flowsiOptimisticColumns_20261029.find(
            (R) => R.id === q.droppableId,
          ),
        [flowsiOptimisticProfile_20261029] =
          flowsiOptimisticSource_20261029.profiles.splice(
            flowsiSourceIndex_20261029 >= 0
              ? flowsiSourceIndex_20261029
              : O.index,
            1,
          );
      flowsiOptimisticDestination_20261029.profiles.splice(
        q.index,
        0,
        flowsiOptimisticProfile_20261029,
      );
      n(flowsiOptimisticColumns_20261029);
      chrome.runtime.sendMessage(
        {
          action: "flowsiCrmMutate",
          mutation: "move",
          profile: E,
          columnId: b.id,
          index: q.index,
          order: flowsiOptimisticDestination_20261029.profiles
            .map((R) => String((R && R.username) || "").trim())
            .filter(Boolean),
        },
        (R) => {
          R && R.success
            ? Y.success("Contato movido com sucesso.")
            : (n(r),
              Y.error((R && R.error) || "Não foi possível mover o contato."));
        },
      );
    },
    N = () => {
      o(!0);
    },
    B = (k) => {
      if (k) {
        const O = { id: `column-${Date.now()}`, title: k, profiles: [] },
          q = [...r, O];
        (n(q),
          chrome.storage.local.set({ kanbanColumns: q }, () => {
            Y.success(`${S("new_column_success_msg")}: "${k}"`);
          }));
      }
      o(!1);
    },
    W = (k) => {
      const O = r
        .flatMap((q) => (Array.isArray(q.profiles) ? q.profiles : []))
        .find((q) => q.id === k);
      if (!O) return;
      chrome.runtime.sendMessage(
        {
          action: "flowsiCrmMutate",
          mutation: "remove",
          profile: O,
          username: O.username,
        },
        (q) => {
          q && q.success
            ? (Y.success(S("profile_removed_success_msg")), P())
            : Y.error((q && q.error) || "Não foi possível remover o contato.");
        },
      );
    },
    X = (k) => {
      if (k.id === "all-chats") {
        Y.error(S("cannot_delete_default_column_msg"));
        return;
      }
      chrome.runtime.sendMessage(
        { action: "flowsiCrmMutate", mutation: "deleteColumn", columnId: k.id },
        (O) => {
          O && O.success
            ? (Y.success(`${S("column_deleted_success_msg")}: "${k.title}"`),
              P())
            : Y.error((O && O.error) || "Não foi possível excluir a coluna.");
        },
      );
    },
    V = (k, O) => {
      const q = r.map((m) => (m.id === k ? { ...m, title: O } : m));
      (n(q),
        chrome.storage.local.set({ kanbanColumns: q }, () => {
          Y.success(`${S("column_name_updated_msg")} "${O}"`);
        }));
    };
  const flowsiAddManualProfile_20261028 = async (k) => {
    const O = String(k || "")
      .trim()
      .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
      .replace(/[\/?#].*$/, "")
      .replace(/^@+/, "")
      .toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(O))
      return Y.error("Digite um @ de Instagram válido.");
    if (flowsiManualBusy_20261028) return;
    flowsiSetManualBusy_20261028(!0);
    try {
      const q = await Ba(O),
        m = (q && q.data) || {},
        v = String(m.username || "").toLowerCase(),
        b = String(m.id || m.pk || "");
      if (v !== O || !/^[0-9]+$/.test(b))
        throw new Error("Não foi possível confirmar esse perfil no Instagram.");
      const E = {
          id: "manual-" + O,
          threadId: "",
          messageId: String(m.eimu_id || m.pk || m.id),
          userId: b,
          pk: b,
          profileId: b,
          notebookId: b,
          username: v,
          name: m.full_name || v,
          full_name: m.full_name || v,
          profileImage: m.profile_pic_url || "",
          profile_pic_url: m.profile_pic_url || "",
          source: "manual",
          addedAt: Date.now(),
        },
        R = await new Promise((T) =>
          chrome.runtime.sendMessage(
            { action: "flowsiCrmMutate", mutation: "manualAdd", profile: E },
            T,
          ),
        );
      if (!R || !R.success)
        throw new Error((R && R.error) || "Não foi possível salvar o contato.");
      (flowsiSetManualOpen_20261028(!1),
        Y.success("@" + v + " foi adicionado ao Kanban."),
        P());
    } catch (q) {
      Y.error((q && q.message) || "Não foi possível adicionar esse perfil.");
    } finally {
      flowsiSetManualBusy_20261028(!1);
    }
  };
  return c
    ? I("div", {
        className: "flowsi-container",
        children: [
          f(Br, { message: h, open: l, onClose: () => g(!1) }),
          f("button", {
            onClick: N,
            className: "flowsi-add-column-btn ",
            children: I("span", {
              className: "flowsi-tooltip-parent-right",
              style: { padding: "0.3rem 0.6rem" },
              children: [
                f(hn, { size: 32, strokeWidth: 2.5 }),
                f("span", {
                  className: "flowsi-tooltip-child-right",
                  children: S("create_label_text"),
                }),
              ],
            }),
          }),
          f("button", {
            type: "button",
            title: "Adicionar pessoa pelo @",
            onClick: () => flowsiSetManualOpen_20261028(!0),
            style: {
              position: "fixed",
              top: "5px",
              left: "138px",
              height: "40px",
              minWidth: "46px",
              padding: "0 10px",
              borderRadius: "6px",
              background: "#dedede",
              color: "#111",
              fontWeight: "700",
              fontSize: "16px",
              zIndex: "5",
            },
            children: "@+",
          }),
          I("div", {
            className: "flowsi-zoomer",
            children: [
              I("button", {
                onClick: D,
                className: " flowsi-tooltip-parent-bottom",
                children: [
                  f(hn, {}),
                  f("span", {
                    className: "flowsi-tooltip-child-bottom",
                    children: S("zoom_in_text"),
                  }),
                ],
              }),
              I("button", {
                onClick: C,
                className: " flowsi-tooltip-parent-bottom",
                children: [
                  f(Jf, {}),
                  f("span", {
                    className: "flowsi-tooltip-child-bottom",
                    children: S("zoom_out_text"),
                  }),
                ],
              }),
            ],
          }),
          f(_a, {
            onDragEnd: _,
            children: f(Nt, {
              droppableId: "board",
              direction: "horizontal",
              type: "COLUMN",
              children: (k) =>
                I("div", {
                  ref: k.innerRef,
                  ...k.droppableProps,
                  className: "flowsi-board",
                  children: [
                    r.map((O, q) =>
                      f(
                        fr,
                        {
                          draggableId: O.id,
                          index: q,
                          children: (m) => {
                            var v;
                            return f("div", {
                              ref: m.innerRef,
                              ...m.draggableProps,
                              children: f(kg, {
                                zoomLevel: u,
                                column: O,
                                setActiveOverlay: e,
                                onDelete: W,
                                deleteColumn: X,
                                updateColumnName: V,
                                dragHandleProps:
                                  (v = m.dragHandleProps) != null ? v : void 0,
                                updateKanbanInfo: w,
                              }),
                            });
                          },
                        },
                        O.id,
                      ),
                    ),
                    k.placeholder,
                  ],
                }),
            }),
          }),
          f(Wa, {
            isOpen: i,
            onClose: () => o(!1),
            onAdd: B,
            title: S("create_column"),
            placeHolder: S("column_name"),
            buttonText: S("create_column_button_text"),
          }),
          f(Wa, {
            isOpen: flowsiManualOpen_20261028,
            onClose: () => flowsiSetManualOpen_20261028(!1),
            onAdd: flowsiAddManualProfile_20261028,
            title: "Adicionar pessoa pelo @",
            placeHolder: "@usuario",
            buttonText: flowsiManualBusy_20261028
              ? "Adicionando..."
              : "Adicionar ao Kanban",
          }),
        ],
      })
    : f(Va, {});
}
const Ag = () =>
    f(Ce, {
      children: I("div", {
        className: "flowsi-account-card flowsi-magic-card",
        children: [
          f("h3", {
            className: "flowsi-account-title-header",
            children: "Modo local",
          }),
          f("p", {
            children:
              "Os dados desta ferramenta são armazenados localmente neste perfil do Chrome.",
          }),
          f("p", {
            children:
              "Use o backup nas configurações para poder restaurá-los se necessário.",
          }),
        ],
      }),
    }),
  Og = () => {
    const [e, t] = x.exports.useState(!1),
      [r, n] = x.exports.useState(!1),
      [i, o] = x.exports.useState(null),
      [a, s] = x.exports.useState("pt_BR"),
      [u, d] = x.exports.useState(!1),
      [c, p] = x.exports.useState(!1),
      [l, g] = x.exports.useState(!1),
      [h, y] = x.exports.useState("");
    x.exports.useEffect(() => {
      chrome.storage.local.get(["flowsiLan"], ({ flowsiLan: N }) => {
        N && s(N);
      });
    }, []);
    const D = (N) => {
        const B = N.target.value;
        (s(B),
          chrome.storage.local.set({ flowsiLan: B }, () => {
            (Y.success(S("language_changed_text")), d(!0));
          }));
      },
      C = () => {
        window.location.reload();
      },
      w = async () => {
        try {
          const N = await chrome.storage.local.get(null),
            X = JSON.stringify(N),
            V = new Blob([X], { type: "application/json" }),
            k = URL.createObjectURL(V),
            O = document.createElement("a");
          ((O.href = k),
            (O.download = "backup_" + new Date().toISOString() + ".json"),
            O.click(),
            URL.revokeObjectURL(k),
            Y.success(S("backup_created_success_text")));
        } catch (N) {
          (console.error("Error downloading backup:", N),
            Y.error(S("backup_creation_error_text")));
        }
      },
      P = async () => {
        if (!!i) {
          t(!0);
          try {
            const N = await i.text(),
              B = JSON.parse(N);
            (await chrome.storage.local.clear(),
              await chrome.storage.local.set(B),
              Y.success(S("backup_restored_success_text")));
          } catch (N) {
            (console.error("Error restoring backup:", N),
              Y.error(S("backup_restored_error_text")));
          } finally {
            t(!1);
          }
        }
      },
      _ = (N) => {
        var W;
        const B = (W = N.target.files) == null ? void 0 : W[0];
        B && (o(B), n(!0));
      };
    return I("div", {
      className: "flowsi-account-card flowsi-magic-card",
      style: { marginBottom: "100px" },
      children: [
        f(Br, { message: h, open: l, onClose: () => g(!1) }),
        f(Ga, {
          title: S("confirm_restore_backup_text"),
          onConfirm: P,
          isOpen: r,
          onClose: () => n(!1),
        }),
        f("h3", {
          className: "flowsi-account-title",
          children: S("general_settings_text"),
        }),
        I("div", {
          className: "flowsi-settings-actions",
          children: [
            f("button", {
              onClick: w,
              className: "flowsi-button",
              children: S("download_backup_text"),
            }),
            I("label", {
              className: "flowsi-backup-input",
              children: [
                S(e ? "restoring_text" : "upload_backup_text"),
                f("input", {
                  type: "file",
                  accept: ".json",
                  onChange: _,
                  disabled: e,
                  style: { display: "none" },
                }),
              ],
            }),
          ],
        }),
        I("div", {
          className: "flowsi-language-selector",
          children: [
            I("label", {
              htmlFor: "language-select",
              children: [S("select_language_text"), ":"],
            }),
            I("select", {
              id: "language-select",
              value: a,
              onChange: D,
              className: "flowsi-select",
              children: [
                f("option", {
                  value: "pt_BR",
                  children: "Portugu\xEAs (Brasil)",
                }),
                f("option", { value: "ES", children: "Espa\xF1ol" }),
                f("option", { value: "EN", children: "English" }),
              ],
            }),
          ],
        }),
        u &&
          f("div", {
            className: "flowsi-reload-button-container",
            children: I("button", {
              style: { background: "red", padding: "5px 10px" },
              onClick: C,
              className: "flowsi-button",
              children: [
                f(tg, {}),
                f("span", {
                  style: { marginLeft: "5px" },
                  children: S("reload_to_apply_changes"),
                }),
              ],
            }),
          }),
      ],
    });
  },
  Rg = () => {
    var C;
    const [e, t] = x.exports.useState(null),
      [r, n] = x.exports.useState(!1),
      [i, o] = x.exports.useState(""),
      [a, s] = x.exports.useState(""),
      [u, d] = x.exports.useState([]),
      [c, p] = x.exports.useState(null),
      [l, g] = x.exports.useState(null);
    x.exports.useEffect(() => {
      (He(),
        chrome.storage.local.get(
          [
            "openNotebook",
            "openNotebookProfile",
            "contactList",
            "kanbanColumns",
            "flowsiActiveChatProfile",
          ],
          async ({
            openNotebook: w,
            openNotebookProfile: j,
            contactList: flowsiNotebookContacts_20261028 = [],
            kanbanColumns: flowsiNotebookColumns_20261028 = [],
            flowsiActiveChatProfile: flowsiNotebookActiveProfile_20261028,
          }) => {
            const flowsiNotebookTarget_20261028 =
              window.flowsiOpenNotebook || w;
            if (flowsiNotebookTarget_20261028) {
              let P =
                typeof flowsiNotebookTarget_20261028 === "string" &&
                !/^\d+$/.test(flowsiNotebookTarget_20261028)
                  ? flowsiNotebookTarget_20261028
                  : bn();
              let flowsiNotebookRawProfile_20261028 =
                window.flowsiOpenNotebookProfile || j || {};
              const flowsiNotebookStoredProfiles_20261028 = [
                  flowsiNotebookActiveProfile_20261028,
                  ...(Array.isArray(flowsiNotebookContacts_20261028)
                    ? flowsiNotebookContacts_20261028
                    : []),
                  ...(Array.isArray(flowsiNotebookColumns_20261028)
                    ? flowsiNotebookColumns_20261028.flatMap(
                        (flowsiNotebookColumn_20261028) =>
                          Array.isArray(flowsiNotebookColumn_20261028.profiles)
                            ? flowsiNotebookColumn_20261028.profiles
                            : [],
                      )
                    : []),
                ].filter(Boolean),
                flowsiNotebookStoredProfile_20261028 =
                  flowsiNotebookStoredProfiles_20261028.find(
                    (flowsiNotebookCandidate_20261028) =>
                      flowsiNotebookCandidate_20261028.username ===
                      flowsiNotebookTarget_20261028,
                  );
              flowsiNotebookStoredProfile_20261028 &&
                (flowsiNotebookRawProfile_20261028 = {
                  ...flowsiNotebookStoredProfile_20261028,
                  ...flowsiNotebookRawProfile_20261028,
                  profileImage:
                    flowsiNotebookRawProfile_20261028.profileImage ||
                    flowsiNotebookStoredProfile_20261028.profileImage ||
                    flowsiNotebookStoredProfile_20261028.profile_pic_url ||
                    "",
                  profile_pic_url:
                    flowsiNotebookRawProfile_20261028.profileImage ||
                    flowsiNotebookStoredProfile_20261028.profileImage ||
                    flowsiNotebookRawProfile_20261028.profile_pic_url ||
                    flowsiNotebookStoredProfile_20261028.profile_pic_url ||
                    "",
                });
              let flowsiNotebookFetchedProfile_20261028 = null,
                flowsiNotebookFetchedData_20261028 = {};
              if (P)
                try {
                  ((flowsiNotebookFetchedProfile_20261028 = await Ba(P)),
                    (flowsiNotebookFetchedData_20261028 =
                      flowsiNotebookFetchedProfile_20261028.data || {}));
                } catch (flowsiNotebookFetchError_20261028) {
                  console.warn(
                    "[Flowsi] Não foi possível atualizar os dados do perfil nas notas:",
                    flowsiNotebookFetchError_20261028,
                  );
                }
              const flowsiNotebookResolvedPhoto_20261028 =
                  flowsiNotebookRawProfile_20261028.profileImage ||
                  flowsiNotebookRawProfile_20261028.profile_pic_url ||
                  flowsiNotebookFetchedData_20261028.profile_pic_url ||
                  (flowsiNotebookFetchedProfile_20261028 &&
                    flowsiNotebookFetchedProfile_20261028.photo) ||
                  "",
                flowsiNotebookProfile_20261028 = {
                  ...flowsiNotebookRawProfile_20261028,
                  id:
                    flowsiNotebookFetchedData_20261028.id ||
                    flowsiNotebookFetchedData_20261028.pk ||
                    flowsiNotebookRawProfile_20261028.userId ||
                    flowsiNotebookRawProfile_20261028.profileId ||
                    flowsiNotebookRawProfile_20261028.notebookId ||
                    P,
                  userId:
                    flowsiNotebookFetchedData_20261028.id ||
                    flowsiNotebookFetchedData_20261028.pk ||
                    flowsiNotebookRawProfile_20261028.userId ||
                    "",
                  profileId:
                    flowsiNotebookFetchedData_20261028.id ||
                    flowsiNotebookFetchedData_20261028.pk ||
                    flowsiNotebookRawProfile_20261028.profileId ||
                    "",
                  pk:
                    flowsiNotebookFetchedData_20261028.pk ||
                    flowsiNotebookFetchedData_20261028.id ||
                    flowsiNotebookRawProfile_20261028.pk ||
                    "",
                  username:
                    flowsiNotebookFetchedData_20261028.username ||
                    flowsiNotebookRawProfile_20261028.username ||
                    P,
                  full_name:
                    flowsiNotebookFetchedData_20261028.full_name ||
                    flowsiNotebookFetchedData_20261028.name ||
                    flowsiNotebookRawProfile_20261028.full_name ||
                    flowsiNotebookRawProfile_20261028.name ||
                    flowsiNotebookRawProfile_20261028.username ||
                    P,
                  profileImage: flowsiNotebookResolvedPhoto_20261028,
                  profile_pic_url: flowsiNotebookResolvedPhoto_20261028,
                  verified: !!(
                    flowsiNotebookFetchedData_20261028.is_verified ||
                    flowsiNotebookRawProfile_20261028.verified
                  ),
                  category_name:
                    flowsiNotebookFetchedData_20261028.category_name ||
                    flowsiNotebookFetchedData_20261028.business_category_name ||
                    flowsiNotebookRawProfile_20261028.category_name ||
                    flowsiNotebookRawProfile_20261028.category ||
                    "",
                  edge_follow:
                    Number(flowsiNotebookFetchedData_20261028.edge_follow?.count) > 0
                      ? flowsiNotebookFetchedData_20261028.edge_follow
                      : Number(flowsiNotebookRawProfile_20261028.edge_follow?.count) > 0
                        ? flowsiNotebookRawProfile_20261028.edge_follow
                        : {
                            count:
                              Number(flowsiNotebookFetchedProfile_20261028?.following) > 0
                                ? Number(flowsiNotebookFetchedProfile_20261028.following)
                                : null,
                          },
                  edge_followed_by:
                    flowsiNotebookFetchedData_20261028.edge_followed_by ||
                      flowsiNotebookRawProfile_20261028.edge_followed_by || {
                        count:
                          (flowsiNotebookFetchedProfile_20261028 &&
                            flowsiNotebookFetchedProfile_20261028.followers) ||
                          0,
                      },
                  edge_owner_to_timeline_media:
                    flowsiNotebookFetchedData_20261028.edge_owner_to_timeline_media ||
                      flowsiNotebookRawProfile_20261028.edge_owner_to_timeline_media || {
                        count:
                          (flowsiNotebookFetchedProfile_20261028 &&
                            flowsiNotebookFetchedProfile_20261028.posts) ||
                          0,
                      },
                  business_email:
                    flowsiNotebookFetchedData_20261028.business_email ||
                    flowsiNotebookRawProfile_20261028.business_email ||
                    "",
                  business_phone_number:
                    flowsiNotebookFetchedData_20261028.business_phone_number ||
                    flowsiNotebookRawProfile_20261028.business_phone_number ||
                    "",
                  website:
                    flowsiNotebookFetchedData_20261028.external_url ||
                    flowsiNotebookRawProfile_20261028.website ||
                    "",
                },
                _ = {
                  data: flowsiNotebookProfile_20261028,
                  isFollow:
                    typeof flowsiNotebookFetchedProfile_20261028?.isFollow ===
                    "boolean"
                      ? flowsiNotebookFetchedProfile_20261028.isFollow
                      : typeof flowsiNotebookRawProfile_20261028.follows_viewer ===
                          "boolean"
                        ? flowsiNotebookRawProfile_20261028.follows_viewer
                        : null,
                };
              ((window.flowsiOpenNotebookProfile =
                flowsiNotebookProfile_20261028),
                chrome.storage.local.set({
                  openNotebookProfile: flowsiNotebookProfile_20261028,
                }),
                g(_.isFollow));
              const {
                business_email: N,
                business_phone_number: B,
                website: W,
                ...X
              } = _;
              let V = { ..._.data };
              ((_.data.website ||
                _.data.business_email ||
                _.data.business_phone_number) &&
                (V = { ..._.data, ...X }),
                t(V),
                chrome.storage.local.get(
                  [`notes_${_.data.id}`, "defaultNoteAdded"],
                  (k) => {
                    let O = k[`notes_${_.data.id}`] || [];
                    const q = k.defaultNoteAdded || [],
                      A = q.includes(_.data.id);
                    ((O = O.filter(
                      (w) => w.key !== "Business Email" && w.key !== "Website",
                    ).map((w) =>
                      w.key === "Business Phone Number"
                        ? { ...w, key: "WhatsApp" }
                        : w,
                    )),
                      A ||
                        O.some((w) => w.key === "WhatsApp") ||
                        O.unshift({
                          key: "WhatsApp",
                          content: _.data.business_phone_number || "",
                        }),
                      A || q.push(_.data.id),
                      chrome.storage.local.set({
                        [`notes_${_.data.id}`]: O,
                        defaultNoteAdded: q,
                      }),
                      d(O));
                  },
                ));
            }
          },
        ));
    }, []);
    const h = () => {
        if (i && a && e) {
          let w;
          (c !== null
            ? (w = u.map((P, _) => (_ === c ? { key: i, content: a } : P)))
            : (w = [...u, { key: i, content: a }]),
            d(w),
            chrome.storage.local.set({ [`notes_${e.id}`]: w }, () => {
              Y.success(S("note_saved_msg"));
            }),
            o(""),
            s(""),
            n(!1),
            p(null));
        }
      },
      y = (w) => {
        const P = u[w];
        (o(P.key), s(P.content), n(!0), p(w));
      },
      D = (w) => {
        if (e) {
          const P = u.filter((_, N) => N !== w);
          (d(P),
            chrome.storage.local.set({ [`notes_${e.id}`]: P }, () => {
              Y.success(S("note_deleted_msg"));
            }));
        }
      };
    return e
      ? I("div", {
          className: "flowsi-notebook",
          children: [
            I("div", {
              className: "flowsi-notebook-header",
              style: { justifyContent: "space-between" },
              children: [
                I("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  },
                  role: "link",
                  tabIndex: 0,
                  title: "Abrir perfil no Instagram",
                  onClick: () => yg("/" + encodeURIComponent(e.username) + "/"),
                  onKeyDown: (w) => {
                    (w.key === "Enter" || w.key === " ") &&
                      (w.preventDefault(),
                      yg("/" + encodeURIComponent(e.username) + "/"));
                  },
                  children: [
                    " ",
                    f("img", {
                      style: { width: "70px", borderRadius: "10px" },
                      src:
                        e.profileImage || e.profile_pic_url
                          ? /^(data:|blob:|chrome-extension:)/.test(
                              e.profileImage || e.profile_pic_url,
                            ) ||
                            (e.profileImage || e.profile_pic_url).includes(
                              "cdn.getwebooster.workers.dev/",
                            )
                            ? e.profileImage || e.profile_pic_url
                            : "https://cdn.getwebooster.workers.dev/" +
                              (e.profileImage || e.profile_pic_url)
                          : chrome.runtime.getURL("/ig-logo.png"),
                      alt: "Foto do perfil",
                      onError: (w) => {
                        const flowsiNotebookImage_20261028 = w.currentTarget,
                          flowsiNotebookOriginalPhoto_20261028 =
                            e.profileImage || e.profile_pic_url || "";
                        if (
                          flowsiNotebookImage_20261028.dataset
                            .flowsiOriginalPhotoTried !== "1" &&
                          /^https?:/i.test(
                            flowsiNotebookOriginalPhoto_20261028,
                          ) &&
                          flowsiNotebookImage_20261028.src !==
                            flowsiNotebookOriginalPhoto_20261028
                        ) {
                          ((flowsiNotebookImage_20261028.dataset.flowsiOriginalPhotoTried =
                            "1"),
                            (flowsiNotebookImage_20261028.src =
                              flowsiNotebookOriginalPhoto_20261028));
                          return;
                        }
                        ((flowsiNotebookImage_20261028.onerror = null),
                          (flowsiNotebookImage_20261028.src =
                            chrome.runtime.getURL("/ig-logo.png")));
                      },
                    }),
                    I("div", {
                      children: [
                        I("h2", {
                          style: {
                            display: "flex",
                            gap: "5px",
                            alignItems: "center",
                          },
                          children: [
                            e.full_name,
                            " ",
                            e.verified &&
                              f("span", {
                                style: { color: "#02b0ed" },
                                children: f(Bf, {}),
                              }),
                          ],
                        }),
                        I("p", { children: ["@", e.username] }),
                      ],
                    }),
                  ],
                }),
                I("p", {
                  style: {
                    display: typeof l === "boolean" ? "flex" : "none",
                    alignItems: "center",
                    gap: "10px",
                  },
                  children: [
                    "Segue você:",
                    " ",
                    typeof l === "boolean"
                      ? l
                        ? f("span", {
                            style: { color: "lime" },
                            children: f(Gf, { size: 20 }),
                          })
                        : f("span", {
                            style: { color: "red" },
                            children: f(Ff, { size: 20 }),
                          })
                      : null,
                  ],
                }),
              ],
            }),
            I("div", {
              style: {
                display: "flex",
                justifyContent: "space-around",
                width: "100%",
                margin: "10px 0",
              },
              children: [
                I("p", {
                  children: [
                    f("strong", { children: "Seguindo:" }),
                    " ",
                    f("br", {}),
                    e.edge_follow.count !== null &&
                    e.edge_follow.count !== void 0 &&
                    Number.isFinite(Number(e.edge_follow.count))
                      ? Math.max(0, Math.trunc(Number(e.edge_follow.count))).toLocaleString("pt-BR")
                      : "…",
                  ],
                }),
                I("p", {
                  children: [
                    f("strong", { children: "Seguidores:" }),
                    " ",
                    f("br", {}),
                    eo(
                      ((C = e == null ? void 0 : e.edge_followed_by) == null
                        ? void 0
                        : C.count) || 0,
                    ),
                  ],
                }),
                I("p", {
                  children: [
                    f("strong", { children: "Publicações:" }),
                    " ",
                    f("br", {}),
                    " ",
                    e.edge_owner_to_timeline_media.count,
                  ],
                }),
              ],
            }),
            I("div", {
              className: "flowsi-notebook-notes",
              children: [
                u.map((w, P) =>
                  I(
                    "div",
                    {
                      className: "flowsi-notebook-details",
                      children: [
                        I("p", {
                          children: [
                            I("strong", { children: [w.key, ":"] }),
                            " ",
                            w.content,
                          ],
                        }),
                        I("div", {
                          className: "flowsi-note-actions",
                          children: [
                            f("button", {
                              onClick: () => y(P),
                              children: f(Ra, { size: 20 }),
                            }),
                            f("button", {
                              onClick: () => D(P),
                              children: f(xt, { size: 20 }),
                            }),
                          ],
                        }),
                      ],
                    },
                    P,
                  ),
                ),
                I("div", {
                  style: { textAlign: "center" },
                  children: [
                    !r &&
                      f("button", {
                        style: { marginTop: "15px" },
                        onClick: () => n(!0),
                        children: "Criar nova nota",
                      }),
                    r &&
                      I("div", {
                        className: "flowsi-new-note",
                        children: [
                          f("input", {
                            type: "text",
                            placeholder: S("title_text"),
                            value: i,
                            onChange: (w) => o(w.target.value),
                          }),
                          f("textarea", {
                            placeholder: S("content_text"),
                            value: a,
                            onChange: (w) => s(w.target.value),
                          }),
                          I("div", {
                            children: [
                              f("button", {
                                className: "hide-new-note",
                                onClick: () => {
                                  (n(!1), p(null), o(""), s(""));
                                },
                                children: "Cancelar",
                              }),
                              f("button", {
                                onClick: h,
                                children:
                                  c !== null ? "Atualizar nota" : "Salvar nota",
                              }),
                            ],
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
          ],
        })
      : f("div", {
          className: "flowsi-notebook-loader",
          children: "Carregando...",
        });
  };
class Tg {
  constructor(t = "keyval-store", r = "keyval") {
    ((this.storeName = r),
      (this._dbp = new Promise((n, i) => {
        const o = indexedDB.open(t, 1);
        ((o.onerror = () => i(o.error)),
          (o.onsuccess = () => n(o.result)),
          (o.onupgradeneeded = () => {
            o.result.createObjectStore(r);
          }));
      })));
  }
  _withIDBStore(t, r) {
    return this._dbp.then(
      (n) =>
        new Promise((i, o) => {
          const a = n.transaction(this.storeName, t);
          ((a.oncomplete = () => i()),
            (a.onabort = a.onerror = () => o(a.error)),
            r(a.objectStore(this.storeName)));
        }),
    );
  }
}
let en;
function Yn() {
  return (en || (en = new Tg()), en);
}
function to(e, t = Yn()) {
  let r;
  return t
    ._withIDBStore("readonly", (n) => {
      r = n.get(e);
    })
    .then(() => r.result);
}
function ro(e, t, r = Yn()) {
  return r._withIDBStore("readwrite", (n) => {
    n.put(t, e);
  });
}
function Bg(e, t = Yn()) {
  return t._withIDBStore("readwrite", (r) => {
    r.delete(e);
  });
}
const it = (e) =>
    new Promise((t, r) => {
      const n = new FileReader();
      ((n.onloadend = () => t(n.result)), (n.onerror = r), n.readAsDataURL(e));
    }),
  Lg = () => {
    var e, t, r;
    return (
      ((e = gr.contactNameEl()) == null ? void 0 : e.getAttribute("title")) ||
      ((r = (t = gr.contactNameEl()) == null ? void 0 : t.textContent) == null
        ? void 0
        : r.trim()) ||
      ""
    );
  },
  flowsiFirstName = (e) => String(e || "").trim().split(/\s+/)[0] || "",
  tn = (e) => {
    const t = Lg();
    return String(e || "")
      .replace(/<\s*(?:name|nome)\s*>/gi, () => t)
      .replace(/<\s*primeironome\s*>/gi, () => flowsiFirstName(t));
  },
  Fg = (e) => chrome.storage.local.set({ quickMessages: e }),
  no = (e) => chrome.storage.local.set({ quickFolders: e }),
  gr = {
    root: dt,
    contactAnchor: La,
    contactNameEl: pg,
    messageInputBase: Fa,
    messageInput: Ua,
    messageInputBar: qa,
    sideOverlay: gg,
  },
  rn = { title: "", content: "", type: "text", folder: "*" },
  Ug = () => {
    const [e, t] = x.exports.useState(!1),
      [r, n] = x.exports.useState(null),
      [i, o] = x.exports.useState([]),
      [a, s] = x.exports.useState(rn),
      [u, d] = x.exports.useState(null),
      [c, p] = x.exports.useState(null),
      [l, g] = x.exports.useState(null),
      [h, y] = x.exports.useState("free"),
      [D, C] = x.exports.useState(!1),
      [w, P] = x.exports.useState(null),
      [_, N] = x.exports.useState(!1),
      [B, W] = x.exports.useState(0),
      X = x.exports.useRef(null),
      V = x.exports.useRef([]),
      k = x.exports.useRef(null),
      O = x.exports.useRef(null),
      [q, m] = x.exports.useState([]),
      [v, b] = x.exports.useState(!1),
      [E, R] = x.exports.useState(""),
      [T, L] = x.exports.useState(!1),
      [j, $] = x.exports.useState(!1),
      [K, G] = x.exports.useState(""),
      [A, J] = x.exports.useState([]),
      [Z, le] = x.exports.useState(0),
      [ee, _e] = x.exports.useState(""),
      [Oe, ze] = x.exports.useState(!1),
      [pt, et] = x.exports.useState("");
    (x.exports.useEffect(() => {
      chrome.storage.local.get(["quickMessages", "quickFolders"], (M) => {
        (M.quickFolders && m(M.quickFolders),
          M.quickMessages &&
            o(M.quickMessages.map((z) => ({ ...z, type: z.type || "text" }))),
          y("local"));
      });
    }, []),
      x.exports.useEffect(
        () => () => {
          l && URL.revokeObjectURL(l);
        },
        [l],
      ));
    const Be = (M, F = !1) => !0,
      Me = () => {
        (t(!1),
          n(null),
          L(!1),
          b(!1),
          $(!1),
          s(rn),
          d(null),
          p(null),
          P(null),
          J([]),
          G(""));
      },
      Ne = (M) => {
        (o(M), Fg(M));
      },
      tt = async () => {
        try {
          const M = await navigator.mediaDevices.getUserMedia({ audio: !0 });
          ((X.current = new MediaRecorder(M)),
            (V.current = []),
            (X.current.ondataavailable = (F) => V.current.push(F.data)),
            (X.current.onstop = () => {
              (P(new Blob(V.current, { type: "audio/mpeg" })),
                s((F) => ({ ...F, type: "voice", content: "" })));
            }),
            X.current.start(),
            C(!0),
            W(0),
            (O.current = setInterval(() => W((F) => F + 1), 1e3)));
        } catch {
          Y.error(S("microphone_access_error"));
        }
      },
      jt = () => {
        X.current && D && (X.current.stop(), C(!1), clearInterval(O.current));
      },
      Le = () => {
        !w ||
          ((k.current = new Audio(URL.createObjectURL(w))),
          k.current.play(),
          N(!0),
          (k.current.onended = () => N(!1)));
      },
      rt = () => {
        var M;
        ((M = k.current) == null || M.pause(),
          k.current && (k.current.currentTime = 0),
          N(!1));
      },
      Qn = () => {
        (P(null), W(0), s((M) => ({ ...M, type: "voice", content: "" })));
      },
      Xn = (M) => {
        var z;
        const F = (z = M.target.files) == null ? void 0 : z[0];
        F && (d(F), s((ie) => ({ ...ie, type: "image" })));
      },
      Zn = (M) => {
        var z;
        const F = (z = M.target.files) == null ? void 0 : z[0];
        F &&
          (p(F),
          s((ie) => ({ ...ie, type: "video" })),
          g(URL.createObjectURL(F)));
      },
      ei = (M) => {
        var z;
        const F = (z = M.target.files) == null ? void 0 : z[0];
        F && (s((ie) => ({ ...ie, type: "voice" })), P(F));
      },
      ti = async () => {
        if (!Be(a.type)) return;
        if (!a.title || (!a.content && !u && !w && !c))
          return Y.error(S("title_and_content_required_msg"));
        if (i.some((F) => F.title === a.title))
          return Y.error(S("title_must_be_unique_msg"));
        const M = { ...a };
        try {
          if (u) ((M.imageUrl = await it(u)), (M.type = "image"));
          else if (c && a.type === "video") {
            const F = await it(c);
            await ro(a.title, F);
          } else a.type === "voice" && w && (M.audioUrl = await it(w));
          (Ne([...i, M]), Y.success(S("quick_message_created_msg")), Me());
        } catch {
          Y.error(S("login_error_msg"));
        }
      },
      Lr = async () => {
        if (r === null || !a.title || (!a.content && !u)) return;
        const M = { ...a };
        try {
          if (u)
            ((M.imageUrl = await it(u)), (M.type = "image"), (M.content = ""));
          else if (c) {
            const z = await it(c);
            (await ro(a.title, z), (M.type = "video"));
          } else a.type === "voice" && w && (M.audioUrl = await it(w));
          const F = [...i];
          ((F[r] = M), Ne(F), Me());
        } catch {
          Y.error(S("login_error_msg"));
        }
      },
      ft = (M) => {
        const F = i.find((ie) => ie.title === M),
          z = i.filter((ie) => ie.title !== M);
        (Ne(z),
          (F == null ? void 0 : F.type) === "video" && Bg(M).catch(() => {}),
          Y.success(
            S("quick_message_deleted_msg") ||
              `Message "${M}" deleted successfully`,
          ));
      },
      Za = (M) => {
        var ie;
        const F = i.find((re) => re.title === M),
          z = i.findIndex((re) => re.title === M);
        if (!(z === -1 || !F)) {
          if (
            ((ie = gr.sideOverlay()) == null ||
              ie.scrollTo({ top: 0, behavior: "smooth" }),
            F.type === "script")
          ) {
            ($(!0),
              chrome.storage.local.get(
                ["quickScripts"],
                ({ quickScripts: re = [] }) => {
                  const se = re.find((ve) => ve.name === F.title);
                  if (!se)
                    return Y.error("Something went wrong. Please try again.");
                  (J(se.script), G(se.name));
                },
              ));
            return;
          }
          (n(z),
            s({ ...F }),
            F.type === "voice" && F.audioUrl
              ? fetch(F.audioUrl)
                  .then((re) => re.blob())
                  .then(P)
              : P(null),
            F.type === "image" && F.imageUrl
              ? fetch(F.imageUrl)
                  .then((re) => re.blob())
                  .then((re) =>
                    d(new File([re], "image.jpg", { type: "image/jpeg" })),
                  )
              : F.type === "video"
                ? to(F.title)
                    .then((re) =>
                      fetch(re)
                        .then((se) => se.blob())
                        .then((se) =>
                          p(new File([se], "video.mp4", { type: "video/mp4" })),
                        ),
                    )
                    .catch(console.error)
                : d(null));
        }
      },
      ri = (M) => {
        if (M.type === "text") {
          if (!gr.messageInputBar())
            return Y.error(S("not_allowed_to_send_msg"));
          Pt(tn(M.content));
        } else
          M.type === "image"
            ? Zr(M.imageUrl || "", tn(M.content || ""))
            : M.type === "voice"
              ? Zr(M.audioUrl || "", "")
              : M.type === "video" &&
                to(M.title)
                  .then((F) => Zr(F || "", tn(M.content || "")))
                  .catch(() => Y.error(S("login_error_msg")));
      },
      es = (M) => {
        if (M.type === "script") {
          chrome.storage.local.get(["quickScripts"], ({ quickScripts: F }) => {
            const z = F.find((ve) => ve.name === M.title);
            if (!(z != null && z.name)) return Y.error("Script not found");
            const ie = z.script;
            let re = 0;
            const se = () => {
              const ve = ie[re];
              if (!!ve)
                if (ve.type === "gap")
                  setTimeout(() => {
                    (re++, se());
                  }, ve.duration * 1e3);
                else {
                  const Ke = i.find((gt) => gt.title === ve.title);
                  (Ke && ri(Ke), re++, se());
                }
            };
            se();
          });
          return;
        }
        ri(M);
      },
      ts = () => {
        if (!E) return;
        if (q.some((F) => F.name === E))
          return Y.error(S("title_must_be_unique_msg"));
        const M = [...q, { name: E }];
        (m(M), no(M), R(""), b(!1));
      },
      rs = (M) => {
        const F = q[M],
          z = q.filter((re, se) => se !== M),
          ie = i.filter((re) => re.folder !== F.name);
        (m(z), Ne(ie), no(z), Y.success(S("folder_deleted_msg")));
      },
      ni = (M) =>
        m(q.map((F) => (F.name === M ? { ...F, expanded: !F.expanded } : F))),
      ns = () => {
        if (Z < 1) return Y.error(S("gap_duration_required_msg"));
        (J([...A, { type: "gap", duration: Z }]), le(0));
      },
      is = () => {
        if (!ee) return Y.error(S("message_script_required_msg"));
        (J([...A, { type: "message", title: ee }]), _e(""));
      },
      os = (M) => J(A.filter((F, z) => z !== M)),
      as = (M) => {
        if (!K) return Y.error(S("script_name_required_msg"));
        if (A.length === 0) return Y.error(S("script_content_required_msg"));
        if (i.some((F) => F.title === K) && !M)
          return Y.error(S("title_must_be_unique_msg"));
        !Be("script", M) ||
          chrome.storage.local.get(
            ["quickScripts"],
            ({ quickScripts: F = [] }) => {
              const z = [...F],
                ie = [...i];
              if (M) {
                const re = z.findIndex((se) => se.name === K);
                re !== -1
                  ? (z[re].script = A)
                  : (z.push({ name: K, script: A }),
                    ie.push({
                      title: K,
                      content: "",
                      type: "script",
                      folder: "*",
                    }));
              } else
                (z.push({ name: K, script: A }),
                  ie.push({
                    title: K,
                    content: "",
                    type: "script",
                    folder: "*",
                  }));
              (o(ie),
                chrome.storage.local.set({
                  quickScripts: z,
                  quickMessages: ie,
                }),
                Y.success(S(M ? "script_updated_msg" : "script_created_msg")),
                Me());
            },
          );
      },
      ss = (M) => {
        if (!M.destination) return;
        const { source: F, destination: z, draggableId: ie } = M,
          re = F.droppableId === "messages",
          se = z.droppableId === "messages",
          ve = F.droppableId.startsWith("folder$$__#F_ID#_$$"),
          Ke = z.droppableId.startsWith("folder$$__#F_ID#_$$"),
          gt = (Fe) => Fe.split("$$__#F_ID#_$$")[1],
          Ae = [...i];
        if (re && se) {
          const Fe = Ae.filter((mt) => mt.folder !== "*"),
            Je = Ae.filter((mt) => mt.folder === "*"),
            [Fr] = Je.splice(F.index, 1);
          (Je.splice(z.index, 0, Fr), Ne([...Fe, ...Je]));
          return;
        }
        const Wt = Ae.findIndex((Fe) => Fe.title === ie);
        if (Wt !== -1) {
          if (re && Ke) Ae[Wt].folder = gt(z.droppableId);
          else if (ve && se) Ae[Wt].folder = "*";
          else if (ve && Ke) Ae[Wt].folder = gt(z.droppableId);
          else if (F.droppableId === z.droppableId && ve) {
            const Fe = gt(F.droppableId),
              Je = Ae.filter((Ur) => Ur.folder === Fe),
              [Fr] = Je.splice(F.index, 1);
            Je.splice(z.index, 0, Fr);
            let mt = 0;
            Ae.forEach((Ur, ls) => {
              Ur.folder === Fe && (Ae[ls] = Je[mt++]);
            });
          }
          Ne(Ae);
        }
      },
      ii = ({ type: M }) =>
        I(Ce, {
          children: [
            M === "text" && f(sg, {}),
            M === "image" && f(Wf, {}),
            M === "voice" && f(Zi, {}),
            M === "video" && f(cg, {}),
            M === "script" && f(Xi, {}),
          ],
        }),
      oi = ({ message: M, provided: F, snapshot: z, showEdit: ie = !0 }) =>
        f("div", {
          ref: F.innerRef,
          ...F.draggableProps,
          ...F.dragHandleProps,
          className: "flowsi-quick-message-item",
          style: {
            ...F.draggableProps.style,
            backgroundColor: z.isDragging ? "#3e00b17a" : void 0,
          },
          children: I("div", {
            className: "flowsi-quick-message-item-header",
            children: [
              I("h3", {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  alignContent: "center",
                  gap: "8px",
                  maxWidth: "70%",
                },
                className: "flowsi-quick-message-item-title",
                children: [f(ii, { type: M.type }), M.title],
              }),
              I("div", {
                className: "flowsi-quick-message-item-actions",
                children: [
                  ie &&
                    f("button", {
                      onClick: () => Za(M.title),
                      className: "flowsi-quick-btn",
                      children: f(Xf, { size: 16 }),
                    }),
                  f("button", {
                    onClick: () => ft(M.title),
                    className: "flowsi-quick-btn flowsi-quick-delete-btn",
                    children: f(xt, { size: 16 }),
                  }),
                  f("button", {
                    onClick: () => es(M),
                    className: "flowsi-quick-btn",
                    children: f(rg, { size: 16 }),
                  }),
                ],
              }),
            ],
          }),
        });
    return I("div", {
      className: "flowsi-quick-message-container",
      children: [
        f(Br, { message: pt, open: Oe, onClose: () => ze(!1) }),
        I("div", {
          style: {
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "25px",
          },
          children: [
            ["text", "image", "video", "voice"].map((M) =>
              I(
                "button",
                {
                  className: "flowsi-quick-message-item flowsi-tooltip-parent",
                  style: { width: "3.5rem", height: "3.5rem" },
                  onClick: () => {
                    (t(!0), s({ ...rn, type: M }), d(null), p(null), P(null));
                  },
                  children: [
                    f(ii, { type: M }),
                    f("span", {
                      className: "flowsi-tooltip-child",
                      children: S(`${M}_message_text`),
                    }),
                  ],
                },
                M,
              ),
            ),
            I("button", {
              className: "flowsi-quick-message-item flowsi-tooltip-parent",
              style: { width: "3.5rem", height: "3.5rem" },
              onClick: () => L(!0),
              children: [
                f(Xi, {}),
                f("span", {
                  className: "flowsi-tooltip-child",
                  children: S("message_script_text"),
                }),
              ],
            }),
            I("button", {
              className: "flowsi-quick-message-item flowsi-tooltip-parent",
              style: { width: "3.5rem", height: "3.5rem" },
              onClick: () => b(!0),
              children: [
                f(Qi, {}),
                f("span", {
                  className: "flowsi-tooltip-child",
                  children: S("create_folder_text"),
                }),
              ],
            }),
          ],
        }),
        (T || j) &&
          I("div", {
            className: "flowsi-quick-message-form",
            style: { position: "relative", paddingTop: "40px" },
            children: [
              f("button", {
                style: { position: "absolute", top: "10px", right: "10px" },
                onClick: Me,
                className: "flowsi-quick-message-close-btn",
                children: "\xD7",
              }),
              f("input", {
                type: "text",
                placeholder: S("script_name_text"),
                value: K,
                onChange: (M) => G(M.target.value),
                className: "flowsi-quick-message-input",
              }),
              A.map((M, F) =>
                f(
                  "div",
                  {
                    className: "flowsi-quick-message-item",
                    style: { marginBottom: "10px" },
                    children: I("h1", {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      },
                      children: [
                        I("span", {
                          style: { fontWeight: "bold", marginRight: "5px" },
                          children: [
                            F + 1,
                            " ",
                            " => ",
                            M.type === "gap"
                              ? `${S("wait_for_text")} ${M.duration} seconds`
                              : `${S("send_message_text")}: ${M.title}`,
                          ],
                        }),
                        f("button", {
                          onClick: () => os(F),
                          children: f(Gt, {}),
                        }),
                      ],
                    }),
                  },
                  F,
                ),
              ),
              I("div", {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px",
                  marginBottom: "20px",
                },
                children: [
                  f("input", {
                    type: "number",
                    placeholder: S("gap_duration_text"),
                    value: Z === 0 ? "" : Z,
                    onChange: (M) =>
                      le(M.target.value === "" ? 0 : Number(M.target.value)),
                    className: "flowsi-quick-message-input",
                    style: { marginBottom: "0" },
                  }),
                  f("button", {
                    className: "flowsi-quick-message-submit-btn",
                    onClick: ns,
                    children: S("add_text"),
                  }),
                ],
              }),
              I("div", {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px",
                  marginBottom: "20px",
                },
                children: [
                  I("select", {
                    value: ee,
                    onChange: (M) => _e(M.target.value),
                    style: { width: "100%" },
                    className: "flowsi-chatbot-select",
                    children: [
                      f("option", {
                        value: "",
                        children: S("script_select_message_text"),
                      }),
                      i.map((M) =>
                        f(
                          "option",
                          { value: M.title, children: M.title },
                          M.title,
                        ),
                      ),
                    ],
                  }),
                  f("button", {
                    className: "flowsi-quick-message-submit-btn",
                    onClick: is,
                    children: S("add_text"),
                  }),
                ],
              }),
              f("button", {
                className: "flowsi-quick-message-submit-btn",
                onClick: () => as(!!j),
                children: S(j ? "update_script_text" : "create_script_text"),
              }),
            ],
          }),
        v &&
          I("div", {
            className: "flowsi-quick-message-form",
            style: { position: "relative", paddingTop: "40px" },
            children: [
              f("button", {
                style: { position: "absolute", top: "10px", right: "10px" },
                onClick: Me,
                className: "flowsi-quick-message-close-btn",
                children: "\xD7",
              }),
              f("input", {
                type: "text",
                placeholder: S("folder_name_text"),
                value: E,
                onChange: (M) => R(M.target.value),
                className: "flowsi-quick-message-input",
              }),
              f("button", {
                className: "flowsi-quick-message-submit-btn",
                onClick: ts,
                children: S("create_folder_text"),
              }),
            ],
          }),
        (e || r !== null) &&
          I("div", {
            className: "flowsi-quick-message-form",
            children: [
              I("div", {
                className: "flowsi-quick-message-form-header",
                children: [
                  f("h3", {
                    children: S(
                      r !== null ? "edit_message" : "create_new_message",
                    ),
                  }),
                  f("button", {
                    onClick: Me,
                    className: "flowsi-quick-message-close-btn",
                    children: "\xD7",
                  }),
                ],
              }),
              f("input", {
                type: "text",
                placeholder: S("title_text"),
                className: "flowsi-quick-message-input",
                value: a.title,
                onChange: (M) => s((F) => ({ ...F, title: M.target.value })),
              }),
              a.type !== "voice" &&
                f("textarea", {
                  placeholder: S("content_text"),
                  className: "flowsi-quick-message-textarea",
                  value: a.content,
                  onChange: (M) =>
                    s((F) => ({ ...F, content: M.target.value })),
                }),
              a.type === "image" &&
                I(Ce, {
                  children: [
                    f("input", {
                      type: "file",
                      accept: "image/*",
                      onChange: Xn,
                      className: "flowsi-quick-message-image-input",
                    }),
                    u &&
                      f("img", {
                        src: URL.createObjectURL(u),
                        alt: "Selected",
                        className: "flowsi-quick-message-preview",
                        style: { maxWidth: "100%", maxHeight: "75px" },
                      }),
                    !u &&
                      a.imageUrl &&
                      f("img", {
                        src: a.imageUrl,
                        alt: "Existing",
                        className: "flowsi-quick-message-preview",
                        style: { maxWidth: "100%", maxHeight: "75px" },
                      }),
                  ],
                }),
              a.type === "video" &&
                I(Ce, {
                  children: [
                    f("input", {
                      type: "file",
                      accept: "video/*",
                      onChange: Zn,
                      className: "flowsi-quick-message-image-input",
                    }),
                    c &&
                      l &&
                      f("video", {
                        src: l,
                        className: "flowsi-quick-message-preview",
                        style: {
                          maxWidth: "100%",
                          maxHeight: "250px",
                          margin: "0 auto",
                        },
                        controls: !0,
                        preload: "metadata",
                        children:
                          "Your browser does not support the video tag.",
                      }),
                  ],
                }),
              a.type === "voice" &&
                I("div", {
                  children: [
                    f("label", {
                      htmlFor: "audioFileInput",
                      children: "Upload Audio File",
                    }),
                    f("input", {
                      type: "file",
                      id: "audioFileInput",
                      accept: "audio/*",
                      onChange: ei,
                      className: "flowsi-quick-message-image-input",
                    }),
                    I("div", {
                      className: "flowsi-quick-message-voice-controls",
                      children: [
                        !D &&
                          !w &&
                          I("button", {
                            onClick: tt,
                            className: "flowsi-voice-btn",
                            children: [f(Zi, {}), " Start Recording"],
                          }),
                        D &&
                          I("button", {
                            onClick: jt,
                            className: "flowsi-voice-btn",
                            children: [f(Yi, {}), " Stop Recording"],
                          }),
                        w &&
                          !_ &&
                          I("button", {
                            onClick: Le,
                            className: "flowsi-voice-btn",
                            children: [f(Zf, {}), " Play"],
                          }),
                        w &&
                          _ &&
                          I("button", {
                            onClick: rt,
                            className: "flowsi-voice-btn",
                            children: [f(Yi, {}), " Stop"],
                          }),
                        B > 0 &&
                          I(Ce, {
                            children: [
                              I("span", {
                                className: "flowsi-voice-duration",
                                children: [B.toFixed(1), "s"],
                              }),
                              w &&
                                !_ &&
                                f("button", {
                                  onClick: Qn,
                                  style: { color: "red" },
                                  className: "flowsi-voice-btn",
                                  children: f(xt, {}),
                                }),
                            ],
                          }),
                      ],
                    }),
                  ],
                }),
              (a.type === "text" || a.type === "image") &&
                f("div", {
                  style: {
                    marginBottom: "20px",
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  },
                  children: [
                    f("span", {
                      className: "flowsi-badge",
                      style: { cursor: "pointer" },
                      onClick: () =>
                        s((M) => ({ ...M, content: M.content + " <nome>" })),
                      children: "nome",
                    }),
                  ],
                }),
              f("button", {
                className: "flowsi-quick-message-submit-btn",
                onClick: r !== null ? Lr : ti,
                children: S(
                  r !== null ? "update_message_text" : "create_message_text",
                ),
              }),
            ],
          }),
        I(_a, {
          onDragEnd: ss,
          children: [
            f("div", {
              className: "flowsi-quick-folder-list",
              style: { marginBottom: "20px" },
              children: q.map((M, F) =>
                f(
                  Nt,
                  {
                    droppableId: `folder$$__#F_ID#_$$${M.name}`,
                    children: (z, ie) =>
                      I("div", {
                        ref: z.innerRef,
                        ...z.droppableProps,
                        className: "flowsi-quick-message-item",
                        style: {
                          backgroundColor: ie.isDraggingOver
                            ? "#3e00b17a"
                            : void 0,
                        },
                        children: [
                          I("div", {
                            className: "flowsi-quick-message-item-header",
                            children: [
                              I("h3", {
                                onClick: () => ni(M.name),
                                style: {
                                  display: "flex",
                                  justifyContent: "center",
                                  alignContent: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  maxWidth: "300px",
                                },
                                className: "flowsi-quick-message-item-title",
                                children: [f(Qi, {}), " ", M.name],
                              }),
                              I("div", {
                                className: "flowsi-quick-message-item-actions",
                                children: [
                                  f("button", {
                                    onClick: () => ni(M.name),
                                    className:
                                      "flowsi-quick-btn flowsi-quick-delete-btn",
                                    children: M.expanded
                                      ? f($f, {})
                                      : f(qf, {}),
                                  }),
                                  f("button", {
                                    onClick: () => rs(F),
                                    className:
                                      "flowsi-quick-btn flowsi-quick-delete-btn",
                                    children: f(xt, { size: 16 }),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          M.expanded &&
                            I("div", {
                              className: "flowsi-quick-folder-list",
                              style: { marginTop: "20px", marginBottom: "0" },
                              children: [
                                i.filter((re) => re.folder === M.name)
                                  .length === 0 &&
                                  f("p", {
                                    style: {
                                      marginTop: "10px",
                                      marginBottom: "0",
                                    },
                                    children: S("empty_folder_text"),
                                  }),
                                i
                                  .filter((re) => re.folder === M.name)
                                  .map((re, se) =>
                                    f(
                                      fr,
                                      {
                                        draggableId: re.title,
                                        index: se,
                                        children: (ve, Ke) =>
                                          f(oi, {
                                            message: re,
                                            provided: ve,
                                            snapshot: Ke,
                                          }),
                                      },
                                      re.title,
                                    ),
                                  ),
                              ],
                            }),
                          z.placeholder,
                        ],
                      }),
                  },
                  M.name,
                ),
              ),
            }),
            f("div", {
              className: "flowsi-quick-message-list",
              children: f(Nt, {
                droppableId: "messages",
                children: (M, F) =>
                  I("div", {
                    ...M.droppableProps,
                    ref: M.innerRef,
                    className: "flowsi-quick-message-list",
                    style: {
                      minHeight: "150px",
                      borderRadius: "10px",
                      backgroundColor: F.isDraggingOver ? "#3e00b17a" : void 0,
                    },
                    children: [
                      i
                        .filter((z) => z.folder === "*")
                        .map((z, ie) =>
                          f(
                            fr,
                            {
                              draggableId: z.title,
                              index: ie,
                              children: (re, se) =>
                                f(oi, {
                                  message: z,
                                  provided: re,
                                  snapshot: se,
                                }),
                            },
                            z.title,
                          ),
                        ),
                      M.placeholder,
                    ],
                  }),
              }),
            }),
          ],
        }),
      ],
    });
  };
var za = {
    color: void 0,
    size: void 0,
    className: void 0,
    style: void 0,
    attr: void 0,
  },
  io = ce.createContext && ce.createContext(za),
  qg = ["attr", "size", "title"];
function $g(e, t) {
  if (e == null) return {};
  var r = Gg(e, t),
    n,
    i;
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    for (i = 0; i < o.length; i++)
      ((n = o[i]),
        !(t.indexOf(n) >= 0) &&
          (!Object.prototype.propertyIsEnumerable.call(e, n) || (r[n] = e[n])));
  }
  return r;
}
function Gg(e, t) {
  if (e == null) return {};
  var r = {};
  for (var n in e)
    if (Object.prototype.hasOwnProperty.call(e, n)) {
      if (t.indexOf(n) >= 0) continue;
      r[n] = e[n];
    }
  return r;
}
function oo(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    (t &&
      (n = n.filter(function (i) {
        return Object.getOwnPropertyDescriptor(e, i).enumerable;
      })),
      r.push.apply(r, n));
  }
  return r;
}
function mr(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2
      ? oo(Object(r), !0).forEach(function (n) {
          jg(e, n, r[n]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r))
        : oo(Object(r)).forEach(function (n) {
            Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
          });
  }
  return e;
}
function jg(e, t, r) {
  return (
    (t = Wg(t)),
    t in e
      ? Object.defineProperty(e, t, {
          value: r,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (e[t] = r),
    e
  );
}
function Wg(e) {
  var t = Vg(e, "string");
  return typeof t == "symbol" ? t : t + "";
}
function Vg(e, t) {
  if (typeof e != "object" || !e) return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (typeof n != "object") return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Ka(e) {
  return (
    e &&
    e.map((t, r) =>
      ce.createElement(t.tag, mr({ key: r }, t.attr), Ka(t.child)),
    )
  );
}
function Hg(e) {
  return (t) => f(zg, { attr: mr({}, e.attr), ...t, children: Ka(e.child) });
}
function zg(e) {
  var t = (r) => {
    var { attr: n, size: i, title: o } = e,
      a = $g(e, qg),
      s = i || r.size || "1em",
      u;
    return (
      r.className && (u = r.className),
      e.className && (u = (u ? u + " " : "") + e.className),
      I("svg", {
        stroke: "currentColor",
        fill: "currentColor",
        strokeWidth: "0",
        ...r.attr,
        ...n,
        ...a,
        className: u,
        style: mr(mr({ color: e.color || r.color }, r.style), e.style),
        height: s,
        width: s,
        xmlns: "http://www.w3.org/2000/svg",
        children: [o && f("title", { children: o }), e.children],
      })
    );
  };
  return io !== void 0 ? f(io.Consumer, { children: (r) => t(r) }) : t(za);
}
function Kg(e) {
  return Hg({
    tag: "svg",
    attr: { viewBox: "0 0 448 512" },
    child: [
      {
        tag: "path",
        attr: {
          d: "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z",
        },
        child: [],
      },
    ],
  })(e);
}
const Jg = () => {
    const t = "https://flowsi.com.br/",
      r = "https://www.instagram.com/flowsi.com.br/",
      n = "http://wa.me/554491654385";
    return I("div", {
      className: "flowsi-help-card flowsi-magic-card",
      children: [
        f("div", {
          className: "flowsi-logo-container",
          children: f("img", {
            src: chrome.runtime.getURL("icon.png"),
            alt: "Flowsi Logo",
            className: "flowsi-logo",
          }),
        }),
        f("h2", { className: "flowsi-title", children: S("contact_us_text") }),
        I("div", {
          className: "flowsi-contact-info",
          children: [
            t &&
              f(nn, {
                href: t,
                icon: f(jf, { size: 24 }),
                text: "Website",
                className: "flowsi-contact-whatsapp",
              }),
            r &&
              f(nn, {
                href: r,
                icon: f(Ta, { size: 24 }),
                text: "Instagram",
                className: "flowsi-contact-instagram",
              }),
            n &&
              f(nn, {
                href: n,
                icon: f(Kg, { size: 24 }),
                text: "WhatsApp",
                className: "flowsi-contact-instagram",
              }),
          ],
        }),
      ],
    });
  },
  nn = ({ href: e, icon: t, text: r, className: n }) =>
    I("a", {
      href: e,
      target: "_blank",
      rel: "noopener noreferrer",
      className: `flowsi-contact-item ${n}`,
      children: [
        f("div", { className: "flowsi-contact-icon", children: t }),
        f("span", { className: "flowsi-contact-text", children: r }),
      ],
    }),
  Yg = () => {
    const [e, t] = x.exports.useState(null),
      [r, n] = x.exports.useState(""),
      [i, o] = x.exports.useState(""),
      [a, s] = x.exports.useState([]),
      [u, d] = x.exports.useState([]),
      [c, p] = x.exports.useState("free"),
      [l, g] = x.exports.useState([]),
      [h, y] = x.exports.useState(!1),
      [D, C] = x.exports.useState("");
    x.exports.useEffect(() => {
      chrome.storage.local.get(
        ["bots", "quickMessages"],
        ({ bots: O = [], quickMessages: q = [] }) => {
          (s(O), p("local"));
          const v = q.filter((b) => b && b.title).map((b) => ({
            ...b,
            type: b.type || "text",
          }));
          d(v);
        },
      );
    }, []);
    const w = (O) => {
        const q = document.querySelector(
            ".flowsi-chatbot-edit-inline-container",
          ),
          m = !!q,
          v = q == null ? void 0 : q.closest(".flowsi-chatbot-section");
        q &&
          (q.remove(),
          (v || document)
            .querySelectorAll('[data-flowsi-hidden-by-editor="true"]')
            .forEach((b) => {
              ((b.hidden = !1),
                b.style.removeProperty("display"),
                delete b.dataset.flowsiHiddenByEditor);
            }));
        (m && e === O
          ? (t(null), setTimeout(() => t(O), 0))
          : t(m ? O : e === O ? null : O),
          g([]),
          n(""),
          o(""));
      },
      P = () => {
        (t(null), g([]), n(""), o(""));
      },
      _ = (O) => {
        if (O.preventDefault()) {
        }
        if (l.length === 0) {
          Y.error(S("please_add_at_least_one_keyword"));
          return;
        }
        const q = { type: e, keywords: l, template: i, start: !0 };
        (chrome.storage.local.get(["bots"], ({ bots: m = [] }) => {
          const v = [...m, q];
          chrome.storage.local.set({ bots: v }, () => {
            (Y.success(S("bot_saved_msg")), s(v));
          });
        }),
          t(null),
          g([]),
          n(""),
          o(""));
      },
      N = (O) => {
        chrome.storage.local.get(["bots"], ({ bots: q = [] }) => {
          const m = q.filter((v, b) => b !== O);
          chrome.storage.local.set({ bots: m }, () => {
            (s(m), Y.success(S("bot_deleted_msg")));
          });
        });
      },
      B = (O) => {
        chrome.storage.local.get(["bots"], ({ bots: q = [] }) => {
          const m = q.map((v, b) => (b === O ? { ...v, start: !v.start } : v));
          chrome.storage.local.set({ bots: m }, () => {
            s(m);
            const v = m[O];
            (v.start &&
              chrome.runtime.sendMessage({ action: "checkNotifications" }),
              Y.success(`Bot ${v.start ? "started" : "stopped"} successfully`));
          });
        });
      },
      W = (O) => {
        O.trim() && !l.includes(O.trim()) && (g([...l, O.trim()]), n(""));
      },
      X = (O) => {
        g(l.filter((q, m) => m !== O));
      },
      V = (O) => {
        (O.key === "Enter" || O.key === ",") && (O.preventDefault(), W(r));
      },
      k = () => {
        if (!r) {
          Y.error("Insira uma parala v\xE1lida!");
          return;
        }
        if (l.includes(r.trim())) {
          Y.error("Palavra j\xE1 existe!");
          return;
        }
        W(r);
      };
    return I(Ce, {
      children: [
        f(Br, { message: D, open: h, onClose: () => y(!1) }),
        I("div", {
          className: "flowsi-chatbot-section",
          children: [
            f("div", {
              className: "flowsi-chatbot-header",
              children: I("button", {
                onClick: () => w("comment"),
                children: [f(zf, {}), " ", S("comment_bot_text")],
              }),
            }),
            e &&
              f("div", {
                className: "flowsi-chatbot-form-container",
                children: I("form", {
                  onSubmit: _,
                  className: "flowsi-chatbot-form",
                  children: [
                    f("h3", { children: S("comment_bot_config_text") }),
                    I("div", {
                      children: [
                        I("div", {
                          className: "flowsi-keyword-list",
                          children: [
                            l.length === 0 &&
                              f("p", { children: S("no_keyword_found") }),
                            l.map((O, q) =>
                              I(
                                "span",
                                {
                                  className: "flowsi-chatbot-keyword-tag",
                                  children: [
                                    O,
                                    f("button", {
                                      type: "button",
                                      onClick: () => X(q),
                                      children: "\xD7",
                                    }),
                                  ],
                                },
                                q,
                              ),
                            ),
                          ],
                        }),
                        I("div", {
                          style: { display: "flex", gap: "5px" },
                          children: [
                            f("input", {
                              type: "text",
                              placeholder: S("enter_keyword_text"),
                              className: "flowsi-chatbot-input",
                              style: { width: "95%", padding: "10px" },
                              value: r,
                              onChange: (O) => n(O.target.value),
                              onKeyDown: V,
                            }),
                            f("button", {
                              type: "button",
                              onClick: k,
                              className: "flowsi-chatbot-add-btn",
                              children: f(hn, { size: 20 }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    I("select", {
                      className: "flowsi-chatbot-select",
                      required: !0,
                      value: i,
                      onChange: (O) => o(O.target.value),
                      children: [
                        f("option", {
                          value: "",
                          children: S("select_a_dm_template"),
                        }),
                        u.map((O, q) =>
                          f("option", { value: O.title, children: O.title }, q),
                        ),
                      ],
                    }),
                    I("div", {
                      className: "flowsi-chatbot-buttons",
                      children: [
                        f("button", {
                          type: "button",
                          onClick: P,
                          className: "flowsi-chatbot-cancel-btn",
                          children: S("cancel_text"),
                        }),
                        f("button", {
                          type: "submit",
                          className: "flowsi-chatbot-create-btn",
                          children: S("create_text"),
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            a.length > 0 &&
              I("div", {
                className: "flowsi-chatbot-list",
                children: [
                  f("h3", { children: S("existing_bots") }),
                  f("div", {
                    className: "flowsi-chatbot-cards",
                    children: [...a]
                      .reverse()
                      .map((O, q) =>
                        I(
                          "div",
                          {
                            className: "flowsi-chatbot-card",
                            children: [
                              f("h4", {
                                children:
                                  O.type === "dm" ? "DM Bot" : "Comment Bot",
                              }),
                              I("p", {
                                children: [
                                  f("strong", { children: "Keywords:" }),
                                  " ",
                                  O.keywords.join(", "),
                                ],
                              }),
                              I("p", {
                                children: [
                                  f("strong", { children: "Template:" }),
                                  " ",
                                  O.template,
                                ],
                              }),
                              I("div", {
                                className: "flowsi-chatbot-card-controls",
                                children: [
                                  f("button", {
                                    className: "flowsi-chatbot-btn",
                                    onClick: () => N(a.length - 1 - q),
                                    children: f(Gt, { size: 20 }),
                                  }),
                                  f("button", {
                                    className: `flowsi-chatbot-btn ${O.start ? "flowsi-chatbot-btn-active" : ""}`,
                                    onClick: () => B(a.length - 1 - q),
                                    children: f(eg, { size: 20 }),
                                  }),
                                ],
                              }),
                            ],
                          },
                          q,
                        ),
                      ),
                  }),
                ],
              }),
          ],
        }),
      ],
    });
  },
  Qg = () => {
    const [e, t] = x.exports.useState(""),
      [r, n] = x.exports.useState("all"),
      [i, o] = x.exports.useState([]),
      a = x.exports.useRef(null),
      [s, u] = x.exports.useState(3),
      [d, c] = x.exports.useState(5),
      [p, l] = x.exports.useState(30),
      [g, h] = x.exports.useState(""),
      [y, D] = x.exports.useState(""),
      [C, w] = x.exports.useState("nao");
    const flowsiBulkLoadColumns_20261029 = () => {
      chrome.storage.local.get(
        ["kanbanColumns"],
        ({ kanbanColumns: N = [] }) => {
          const B = Array.isArray(N)
              ? N.filter((W) => W && W.id && W.id !== "all-chats")
              : [],
            W = new Set(B.map((X) => String(X.id)));
          (o([{ id: "all-chats", title: S("first_column_title"), profiles: [] }, ...B]),
            n((X) => (W.has(String(X)) ? X : "")),
            h((X) => (W.has(String(X)) ? X : "")));
        },
      );
    };
    x.exports.useEffect(() => {
      He();
      flowsiBulkLoadColumns_20261029();
      const N = (B, W) => {
          W === "local" && B.kanbanColumns && flowsiBulkLoadColumns_20261029();
        },
        B = () => flowsiBulkLoadColumns_20261029(),
        W = () => {
          document.visibilityState === "visible" && flowsiBulkLoadColumns_20261029();
        };
      return (
        chrome.storage.onChanged.addListener(N),
        window.addEventListener("focus", B),
        document.addEventListener("visibilitychange", W),
        () => {
          (chrome.storage.onChanged.removeListener(N),
            window.removeEventListener("focus", B),
            document.removeEventListener("visibilitychange", W));
        }
      );
    }, []);
    const P = (N) => {
        N.preventDefault();
        const B = i.find((V) => V.id === r);
        if (!B || !Array.isArray(B.profiles) || !B.profiles.length) {
          Y.error("Selecione uma coluna que tenha contatos.");
          return;
        }
        const flowsiBulkUniqueProfiles_20261029 = [
            ...new Map(
              B.profiles
                .map((V) => [
                  String((V == null ? void 0 : V.username) || "")
                    .replace(/^@+/, "")
                    .trim()
                    .toLowerCase(),
                  V,
                ])
                .filter(([V]) => V),
            ).values(),
          ],
          flowsiBulkCampaignId_20261029 = `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          W = {
          profiles: flowsiBulkUniqueProfiles_20261029.map((V) => ({ ...V })),
          totalProfileCount: flowsiBulkUniqueProfiles_20261029.length,
          waitTime: s,
          branchSize: d,
          branchGap: p,
          message: e,
          onSuccessLabel: C === "sim" ? "" : g,
          removeLabel: C,
          onSuccessLabelRemove: r,
          sentInCurrentBlock: 0,
          startedAt: Date.now(),
          campaignId: flowsiBulkCampaignId_20261029,
        };
        chrome.storage.local.set({ bulkdata: W }, () => {
          if (chrome.runtime.lastError) {
            Y.error("Não foi possível iniciar a campanha.");
            return;
          }
          Im();
        });
      },
      _ = (N) => {
        if (a.current) {
          const B = a.current.selectionStart,
            W = a.current.selectionEnd,
            X = e.substring(0, B) + N + e.substring(W);
          (t(X),
            setTimeout(() => {
              var V, k;
              ((V = a.current) == null ||
                V.setSelectionRange(B + N.length, B + N.length),
                (k = a.current) == null || k.focus());
            }, 0));
        }
      };
    return f("div", {
      className: "bulk-messages",
      style: { marginTop: "30px" },
      children: I("form", {
        onSubmit: P,
        children: [
          I("div", {
            className: "form-group",
            children: [
              f("label", { htmlFor: "message", children: S("message_label") }),
              f("textarea", {
                id: "message",
                ref: a,
                className: "flowsi-quick-message-textarea",
                value: e,
                onChange: (N) => t(N.target.value),
                placeholder:
                  S("enter_bulk_message_placeholder") ||
                  "Enter you message content...",
                required: !0,
              }),
              I("div", {
                style: {
                  marginBottom: "20px",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                },
                children: [
                  f("span", {
                    className: "flowsi-badge",
                    onClick: () => _("<nome>"),
                    style: { cursor: "pointer" },
                    children: "nome",
                  }),
                ],
              }),
            ],
          }),
          I("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              justifyContent: "space-between",
            },
            children: [
              f("label", {
                htmlFor: "recipientType",
                children:
                  S("bulk_sender_select_column") || "Select recipient column",
              }),
              I("select", {
                id: "recipientType",
                className: "flowsi-bulk-sender-select",
                value: r,
                onFocus: flowsiBulkLoadColumns_20261029,
                onChange: (N) => {
                  (n(N.target.value), D(N.target.value));
                },
                children: [
                  f("option", {
                    value: "",
                    children: S("select_column_placeholder"),
                  }),
                  i
                    .slice(1)
                    .map((N) =>
                      f("option", { value: N.id, children: N.title }, N.id),
                    ),
                ],
              }),
            ],
          }),
          I("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              justifyContent: "space-between",
            },
            children: [
              f("label", {
                htmlFor: "onSuccessLabelRemove",
                children: S("on_success_remove_column"),
              }),
              I("select", {
                id: "onSuccessLabelRemove",
                className: "flowsi-bulk-sender-select",
                value: C,
                onChange: (N) => {
                  (w(N.target.value),
                    N.target.value === "sim" && h(""));
                },
                children: [
                  f("option", { value: "nao", children: "N\xE3o" }),
                  f("option", { value: "sim", children: "Sim" }),
                ],
              }),
            ],
          }),
          C === "nao" &&
            I("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
                justifyContent: "space-between",
              },
              children: [
                f("label", {
                  htmlFor: "onSuccessLabel",
                  children: S("on_success_copy_to_column"),
                }),
                I("select", {
                  id: "onSuccessLabel",
                  className: "flowsi-bulk-sender-select",
                  value: g,
                  onFocus: flowsiBulkLoadColumns_20261029,
                  onChange: (N) => h(N.target.value),
                  children: [
                    f("option", {
                      value: "",
                      children:
                        S("bulk_keep_current_column") || "Manter coluna atual",
                    }),
                    i
                      .slice(1)
                      .map((N) =>
                        f("option", { value: N.id, children: N.title }, N.id),
                      ),
                  ],
                }),
              ],
            }),
          I("div", {
            children: [
              I("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                  justifyContent: "space-between",
                },
                children: [
                  f("label", {
                    children:
                      S("bulk_wait_each_msg") ||
                      "Wait between each message in seconds",
                  }),
                  f("input", {
                    style: { maxWidth: "100px", marginBottom: "0" },
                    className: "flowsi-input",
                    type: "number",
                    value: s,
                    onChange: (N) => u(Number(N.target.value)),
                  }),
                ],
              }),
              I("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                  justifyContent: "space-between",
                },
                children: [
                  f("label", {
                    children: S("bulk_branch_size_msg") || "Branch size",
                  }),
                  f("input", {
                    style: { maxWidth: "100px", marginBottom: "0" },
                    className: "flowsi-input",
                    type: "number",
                    value: d,
                    onChange: (N) => c(Number(N.target.value)),
                  }),
                ],
              }),
              I("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "30px",
                  justifyContent: "space-between",
                },
                children: [
                  f("label", {
                    children:
                      S("bulk_branch_gap_msg") || "Branch gap in seconds",
                  }),
                  f("input", {
                    style: { maxWidth: "100px", marginBottom: "0" },
                    className: "flowsi-input",
                    type: "number",
                    value: p,
                    onChange: (N) => l(Number(N.target.value)),
                  }),
                ],
              }),
            ],
          }),
          f("button", {
            type: "submit",
            className: "flowsi-quick-message-submit-btn",
            children: S("send_text") || "Send",
          }),
        ],
      }),
    });
  },
  Xg = () =>
    f("div", {
      className: "flowsi-bulk-messages-container",
      children: f(Qg, {}),
    }),
  Zg = ({ type: e, setActiveOverlay: t }) => {
    const [r, n] = x.exports.useState(!0),
      [i, o] = x.exports.useState(!1);
    x.exports.useEffect(() => {
      n(!0);
    }, []);
    const a = () => {
      switch (e) {
        case "account":
          return I("div", {
            className: "flowsi-account-side-layout",
            children: [f(Ag, {}), f(Og, {})],
          });
        case "quick-message":
          return f(Ug, {});
        case "notebook":
          return f(Rg, {});
        case "chatbot":
          return f(Yg, {});
        case "bulk-messages":
          return f(Xg, {});
        default:
          return I("p", { children: ["Content for ", e] });
      }
    };
    return r
      ? I("div", {
          className: "flowsi-side-overlay",
          children: [
            I("header", {
              children: [
                I("h2", {
                  children: [
                    e === "quick-message" && S("quick_message_title"),
                    e === "chatbot" && S("manage_chatbot_title"),
                    e === "bulk-messages" && S("bulk_messages_title"),
                    e === "account" && S("manage_account_title"),
                  ],
                }),
                f("button", {
                  onClick: () => t(null),
                  className: "flowsi-close",
                  children: f(Gt, { size: 16 }),
                }),
              ],
            }),
            a(),
          ],
        })
      : f(Va, {});
  },
  em = ({ setUpdateKanbanColumn: e }) => {
    const [t, r] = x.exports.useState([]),
      [n, i] = x.exports.useState([]),
      [o, a] = x.exports.useState(!1),
      flowsiCrmKey_20261028 = (d) =>
        String(d || "")
          .trim()
          .toLowerCase()
          .replace(/^@+/, "")
          .replace(/\s+/g, ""),
      flowsiCurrentThreadId_20261028 = () => {
        const d = window.location.pathname.match(/^\/direct\/t\/([^/]+)/);
        return d ? String(d[1]) : "";
      },
      flowsiResolveChatProfile_20261028 = (d = [], c = []) => {
        const p = flowsiCurrentThreadId_20261028(),
          l = [
            ...d,
            ...c
              .slice(1)
              .flatMap((y) => (Array.isArray(y.profiles) ? y.profiles : [])),
          ],
          g = p
            ? l.find((y) =>
                [y.threadId, y.id].some((D) => String(D || "") === p),
              )
            : null;
        if (g) return g;
        const h = window.flowsiActiveChatProfile_20261028;
        if (h && (!p || [h.threadId, h.id].some((y) => String(y || "") === p)))
          return h;
        const y = dg(),
          D = y
            ? [...y.querySelectorAll("a[href]")].find((C) => {
                try {
                  const w = new URL(C.href, location.origin).pathname.match(
                    /^\/([A-Za-z0-9._]{1,30})\/?$/,
                  );
                  return !!(
                    w &&
                    !["direct", "explore", "reels", "accounts"].includes(w[1])
                  );
                } catch {
                  return !1;
                }
              })
            : null,
          C = D
            ? new URL(D.href, location.origin).pathname
                .split("/")
                .filter(Boolean)[0]
            : bn();
        return C
          ? l.find(
              (w) =>
                flowsiCrmKey_20261028(w.username) === flowsiCrmKey_20261028(C),
            ) || {
              id: p || "dom-" + C,
              threadId: p,
              messageId: p || "dom-" + C,
              username: C,
              name:
                (y == null ? void 0 : y.querySelector("span[title]")) == null
                  ? void 0
                  : y.querySelector("span[title]").textContent,
              profileImage:
                (y == null ? void 0 : y.querySelector("img")) == null
                  ? void 0
                  : y.querySelector("img").getAttribute("src"),
            }
          : null;
      },
      s = x.exports.useCallback(() => {
        chrome.storage.local.get(
          ["kanbanColumns", "contactList", "flowsiKanbanAssignmentsV2"],
          ({
            kanbanColumns: d = [],
            contactList: c = [],
            flowsiKanbanAssignmentsV2: p = {},
          }) => {
            const l = d.slice(1);
            r(l);
            const g = flowsiResolveChatProfile_20261028(c, d),
              h = flowsiCrmKey_20261028(g == null ? void 0 : g.username),
              y = p && p[h];
            if (y && l.some((D) => D.id === y.columnId)) {
              i([y.columnId]);
              return;
            }
            if (!h) {
              i([]);
              return;
            }
            const D = l
              .filter((C) =>
                (Array.isArray(C.profiles) ? C.profiles : []).some(
                  (w) => flowsiCrmKey_20261028(w.username) === h,
                ),
              )
              .map((C) => C.id);
            i(D.slice(-1));
          },
        );
      }, []);
    x.exports.useEffect(() => {
      s();
      const d = setInterval(s, 1500),
        c = (p, l) => {
          l === "local" &&
            ["flowsiKanbanAssignmentsV2", "kanbanColumns", "contactList"].some(
              (g) => p[g],
            ) &&
            s();
        };
      return (
        chrome.storage.onChanged.addListener(c),
        () => {
          (clearInterval(d), chrome.storage.onChanged.removeListener(c));
        }
      );
    }, [s]);
    const u = (d) => {
      if (o) return;
      chrome.storage.local.get(
        ["kanbanColumns", "contactList"],
        ({ kanbanColumns: c = [], contactList: p = [] }) => {
          const l = flowsiResolveChatProfile_20261028(p, c),
            g = l == null ? void 0 : l.username;
          if (!g)
            return Y.error(
              "Não foi possível identificar o usuário desta conversa.",
            );
          const h = flowsiCurrentThreadId_20261028(),
            y = {
              ...l,
              id: l.id || "crm-" + g,
              threadId: l.threadId || h,
              messageId: l.messageId || h || l.id,
              username: g,
              name: l.name || l.full_name || g,
              profileImage: l.profileImage || l.profile_pic_url || "",
              source: "crm",
            };
          (a(!0),
            chrome.runtime.sendMessage(
              {
                action: "flowsiCrmMutate",
                mutation: "toggleAssign",
                columnId: d,
                profile: y,
              },
              (D) => {
                (a(!1),
                  D && D.success
                    ? (s(),
                      e(Math.floor(1e4 + Math.random() * 9e4)),
                      window.dispatchEvent(
                        new CustomEvent("flowsi-kanban-updated-20261028"),
                      ),
                      Y.success("Kanban atualizado com sucesso!"))
                    : Y.error(
                        (D && D.error) || "Não foi possível salvar no Kanban.",
                      ));
              },
            ));
        },
      );
    };
    return f("div", {
      className: "flowsi-label-popover-card",
      children: f("div", {
        className: "flowsi-label-list",
        children: t.map((d) =>
          f(
            "div",
            {
              className: "flowsi-label-item",
              children: I("label", {
                children: [
                  d.title,
                  f("input", {
                    type: "checkbox",
                    disabled: o,
                    checked: n.includes(d.id),
                    onChange: () => u(d.id),
                  }),
                ],
              }),
            },
            d.id,
          ),
        ),
      }),
    });
  },
  ao = (e) => {
    let t;
    const r = new Set(),
      n = (d, c) => {
        const p = typeof d == "function" ? d(t) : d;
        if (!Object.is(p, t)) {
          const l = t;
          ((t = (c != null ? c : typeof p != "object" || p === null)
            ? p
            : Object.assign({}, t, p)),
            r.forEach((g) => g(t, l)));
        }
      },
      i = () => t,
      s = {
        setState: n,
        getState: i,
        getInitialState: () => u,
        subscribe: (d) => (r.add(d), () => r.delete(d)),
      },
      u = (t = e(n, i, s));
    return s;
  },
  tm = (e) => (e ? ao(e) : ao),
  rm = (e) => e;
function nm(e, t = rm) {
  const r = ce.useSyncExternalStore(
    e.subscribe,
    () => t(e.getState()),
    () => t(e.getInitialState()),
  );
  return (ce.useDebugValue(r), r);
}
const so = (e) => {
    const t = tm(e),
      r = (n) => nm(t, n);
    return (Object.assign(r, t), r);
  },
  im = (e) => (e ? so(e) : so);
function Ja(e, t) {
  let r;
  try {
    r = e();
  } catch {
    return;
  }
  return {
    getItem: (i) => {
      var o;
      const a = (u) =>
          u === null ? null : JSON.parse(u, t == null ? void 0 : t.reviver),
        s = (o = r.getItem(i)) != null ? o : null;
      return s instanceof Promise ? s.then(a) : a(s);
    },
    setItem: (i, o) =>
      r.setItem(i, JSON.stringify(o, t == null ? void 0 : t.replacer)),
    removeItem: (i) => r.removeItem(i),
  };
}
const yn = (e) => (t) => {
    try {
      const r = e(t);
      return r instanceof Promise
        ? r
        : {
            then(n) {
              return yn(n)(r);
            },
            catch(n) {
              return this;
            },
          };
    } catch (r) {
      return {
        then(n) {
          return this;
        },
        catch(n) {
          return yn(n)(r);
        },
      };
    }
  },
  om = (e, t) => (r, n, i) => {
    let o = {
        storage: Ja(() => localStorage),
        partialize: (y) => y,
        version: 0,
        merge: (y, D) => ({ ...D, ...y }),
        ...t,
      },
      a = !1;
    const s = new Set(),
      u = new Set();
    let d = o.storage;
    if (!d)
      return e(
        (...y) => {
          (console.warn(
            `[zustand persist middleware] Unable to update item '${o.name}', the given storage is currently unavailable.`,
          ),
            r(...y));
        },
        n,
        i,
      );
    const c = () => {
        const y = o.partialize({ ...n() });
        return d.setItem(o.name, { state: y, version: o.version });
      },
      p = i.setState;
    i.setState = (y, D) => {
      (p(y, D), c());
    };
    const l = e(
      (...y) => {
        (r(...y), c());
      },
      n,
      i,
    );
    i.getInitialState = () => l;
    let g;
    const h = () => {
      var y, D;
      if (!d) return;
      ((a = !1),
        s.forEach((w) => {
          var P;
          return w((P = n()) != null ? P : l);
        }));
      const C =
        ((D = o.onRehydrateStorage) == null
          ? void 0
          : D.call(o, (y = n()) != null ? y : l)) || void 0;
      return yn(d.getItem.bind(d))(o.name)
        .then((w) => {
          if (w)
            if (typeof w.version == "number" && w.version !== o.version) {
              if (o.migrate) return [!0, o.migrate(w.state, w.version)];
              console.error(
                "State loaded from storage couldn't be migrated since no migrate function was provided",
              );
            } else return [!1, w.state];
          return [!1, void 0];
        })
        .then((w) => {
          var P;
          const [_, N] = w;
          if (((g = o.merge(N, (P = n()) != null ? P : l)), r(g, !0), _))
            return c();
        })
        .then(() => {
          (C == null || C(g, void 0),
            (g = n()),
            (a = !0),
            u.forEach((w) => w(g)));
        })
        .catch((w) => {
          C == null || C(void 0, w);
        });
    };
    return (
      (i.persist = {
        setOptions: (y) => {
          ((o = { ...o, ...y }), y.storage && (d = y.storage));
        },
        clearStorage: () => {
          d == null || d.removeItem(o.name);
        },
        getOptions: () => o,
        rehydrate: () => h(),
        hasHydrated: () => a,
        onHydrate: (y) => (
          s.add(y),
          () => {
            s.delete(y);
          }
        ),
        onFinishHydration: (y) => (
          u.add(y),
          () => {
            u.delete(y);
          }
        ),
      }),
      o.skipHydration || h(),
      g || l
    );
  },
  am = om,
  sm = () =>
    typeof window < "u" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  Ya = im()(
    am(
      (e) => ({
        theme: sm(),
        toggleTheme: () =>
          e((t) => ({ theme: t.theme === "light" ? "dark" : "light" })),
      }),
      { name: "theme-storage", storage: Ja(() => localStorage) },
    ),
  ),
  lm = () => {
    const [e, t] = x.exports.useState(!1),
      [r, n] = x.exports.useState(null),
      [i, o] = x.exports.useState(0),
      { theme: a, toggleTheme: s } = Ya(),
      u = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    (x.exports.useEffect(() => {
      He();
    }, []),
      x.exports.useEffect(() => {
        const l = setInterval(() => {
          p();
        }, 750);
        return (
          p(),
          () => {
            clearInterval(l);
          }
        );
      }, []));
    const d = (l, g) => {
        l.preventDefault();
        const flowsiClosingKanban_20261029 = g && e;
        if (flowsiClosingKanban_20261029) {
          const flowsiInboxLink_20261029 = document.querySelector(
            'a[href="/direct/inbox/"]',
          );
          if (window.location.pathname !== "/direct/inbox/") {
            flowsiInboxLink_20261029
              ? flowsiInboxLink_20261029.click()
              : yg("/direct/inbox/");
          }
          (t(!1), n(null));
          return;
        }
        if (!window.location.href.includes("instagram.com/direct/")) {
          const h = document.querySelector('a[href="/direct/inbox/"]');
          h == null || h.click();
        }
        (t(g ? !0 : !1), n(null));
      },
      c = (l) => {
        n(r === l ? null : l);
      },
      p = () => {
        const l = dg();
        if (
          l &&
          (!l.querySelector("#flowsi-chatpage") ||
            !l.querySelector(".flowsi-quick-message-label"))
        ) {
          document
            .querySelectorAll("#flowsi-chatpage,.flowsi-quick-message-label")
            .forEach((N) => N.remove());
          const D = document.createElement("button"),
            C = document.createElement("span");
          (C.classList.add("flowsi-quick-message-icon"),
            (D.style.color = u === "dark" ? "#997cff" : "#5424ff"),
            Vt.createRoot(C).render(f(Qf, {})),
            D.appendChild(C));
          const w = document.createElement("button");
          (w.classList.add("flowsi-quick-message-label"),
            (w.style.color = u === "dark" ? "black" : "white"),
            (w.style.backgroundColor = u === "dark" ? "white" : "black"),
            (w.textContent = "+CRM"));
          const P = document.createElement("span");
          (P.classList.add("flowsi-quick-message-icon"),
            Vt.createRoot(P).render(f(ig, {})),
            w.prepend(P));
          const _ = document.createElement("div");
          (_.classList.add("flowsi-label-popover"),
            (_.style.display = "none"),
            Vt.createRoot(_).render(f(em, { setUpdateKanbanColumn: o })),
            (w.style.position = "relative"),
            (_.style.position = "absolute"),
            (_.style.top = "100%"),
            (_.style.right = "60px"),
            (_.style.zIndex = "1000"),
            w.appendChild(_),
            w.addEventListener("click", (N) => {
              (N.stopPropagation(),
                (_.style.display =
                  _.style.display === "none" ? "block" : "none"));
            }),
            document.addEventListener("click", () => {
              _.style.display = "none";
            }),
            _.addEventListener("click", (N) => {
              N.stopPropagation();
            }),
            D.addEventListener("click", () => {
              const N = window.location.href;
              if (
                (console.log({ url: N }),
                !N.startsWith("https://www.instagram.com/direct/t/"))
              )
                return;
              const B = window.flowsiActiveChatProfile_20261028;
              if (B && B.username) {
                const W = {
                  ...B,
                  notebookId:
                    B.notebookId || B.profileId || B.userId || B.username,
                  full_name: B.full_name || B.name || B.username,
                  profile_pic_url: B.profileImage || B.profile_pic_url || "",
                };
                ((window.flowsiOpenNotebook = B.username),
                  (window.flowsiOpenNotebookProfile = W),
                  chrome.storage.local.set(
                    { openNotebook: B.username, openNotebookProfile: W },
                    () => {
                      n("notebook");
                    },
                  ));
                return;
              }
              const W = N.split("/").filter(Boolean).pop();
              chrome.storage.local.set({ openNotebook: Number(W) }, () => {
                n("notebook");
              });
            }),
            (D.id = "flowsi-chatpage"),
            D.classList.add("flowsi-chatpage-crmbutton"),
            l == null || l.prepend(D),
            l == null || l.prepend(w));
        }
        const g = fg();
        if (!g || g.querySelector(".flowsi-quick-message-button")) return;
        const h = document.createElement("button");
        ((h.style.color = u === "dark" ? "white" : "black"),
          h.classList.add(
            "flowsi-chatpage-crmbutton",
            "flowsi-quick-message-button",
          ));
        const y = document.createElement("span");
        (y.classList.add("flowsi-quick-message-icon"),
          Vt.createRoot(y).render(
            I("svg", {
              stroke: "currentColor",
              fill: "currentColor",
              strokeWidth: "0",
              viewBox: "0 0 24 24",
              height: "24",
              width: "24",
              xmlns: "http://www.w3.org/2000/svg",
              children: [
                f("path", { fill: "none", d: "M0 0h24v24H0z" }),
                f("path", {
                  d: "M4 17.17V4h16v6h2V4c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h9v-2H5.17L4 17.17z",
                }),
                f("path", { d: "M22.5 16h-2.2l1.7-4h-5v6h2v5z" }),
              ],
            }),
          ),
          h.appendChild(y),
          g.prepend(h));
        const B = () => {
          const W =
              document.querySelector(
                'main[role="main"] [contenteditable="true"]',
              ) || document.querySelector('[contenteditable="true"]'),
            X = W
              ? "value" in W
                ? W.value
                : W.innerText || W.textContent || ""
              : "";
          X.replace(/\u200b/g, "").trim()
            ? (h.style.display = "none")
            : h.style.removeProperty("display");
        };
        (window.__flowsiQuickMessageInputHandler_20261028 &&
          document.removeEventListener(
            "input",
            window.__flowsiQuickMessageInputHandler_20261028,
            !0,
          ),
          (window.__flowsiQuickMessageInputHandler_20261028 = () =>
            setTimeout(B, 0)),
          document.addEventListener(
            "input",
            window.__flowsiQuickMessageInputHandler_20261028,
            !0,
          ),
          window.__flowsiQuickMessageObserver_20261028 &&
            window.__flowsiQuickMessageObserver_20261028.disconnect(),
          (window.__flowsiQuickMessageObserver_20261028 = new MutationObserver(
            B,
          )));
        const W =
          document.querySelector(
            'main[role="main"] [contenteditable="true"]',
          ) || document.querySelector('[contenteditable="true"]');
        (W &&
          window.__flowsiQuickMessageObserver_20261028.observe(W, {
            subtree: !0,
            childList: !0,
            characterData: !0,
          }),
          B(),
          h.addEventListener("click", () => {
            n("quick-message");
          }));
      };
    return (
      x.exports.useEffect(() => {
        p();
      }, []),
      I(Ce, {
        children: [
          I("nav", {
            className: "flowsi-sidebar",
            children: [
              I("div", {
                className: "flowsi-sidebar-list",
                children: [
                  I("ul", {
                    children: [
                      f("li", {
                        children: I("button", {
                          onClick: (l) => d(l, !1),
                          className: e
                            ? "flowsi-tooltip-parent-right"
                            : "flowsi-active  flowsi-tooltip-parent-right",
                          children: [
                            f(Ta, {}),
                            f("span", {
                              className: "flowsi-tooltip-child-right",
                              children: S("instagram_text"),
                            }),
                          ],
                        }),
                      }),
                      f("li", {
                        children: I("button", {
                          onClick: (l) => d(l, !0),
                          className: e
                            ? "flowsi-active  flowsi-tooltip-parent-right"
                            : "flowsi-tooltip-parent-right",
                          children: [
                            f(ig, {}),
                            f("span", {
                              className: "flowsi-tooltip-child-right",
                              children: S("kanban_crm_text"),
                            }),
                          ],
                        }),
                      }),
                      f("li", {
                        children: I("button", {
                          className: "flowsi-tooltip-parent-right",
                          onClick: () => c("quick-message"),
                          children: [
                            I("svg", {
                              stroke: "currentColor",
                              fill: "currentColor",
                              strokeWidth: "0",
                              viewBox: "0 0 24 24",
                              height: "1em",
                              width: "1em",
                              xmlns: "http://www.w3.org/2000/svg",
                              children: [
                                f("path", { fill: "none", d: "M0 0h24v24H0z" }),
                                f("path", {
                                  d: "M4 17.17V4h16v6h2V4c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h9v-2H5.17L4 17.17z",
                                }),
                                f("path", {
                                  d: "M22.5 16h-2.2l1.7-4h-5v6h2v5z",
                                }),
                              ],
                            }),
                            " ",
                            f("span", {
                              className: "flowsi-tooltip-child-right",
                              children: S("quick_messages_text"),
                            }),
                          ],
                        }),
                      }),
                      f("li", {
                        children: I("button", {
                          className: "flowsi-tooltip-parent-right",
                          onClick: () => c("chatbot"),
                          children: [
                            f(Uf, {}),
                            f("span", {
                              className: "flowsi-tooltip-child-right",
                              children: S("chatbot_text"),
                            }),
                          ],
                        }),
                      }),
                      f("li", {
                        children: I("button", {
                          className: "flowsi-tooltip-parent-right",
                          onClick: () => c("bulk-messages"),
                          children: [
                            f(ng, {}),
                            f("span", {
                              className: "flowsi-tooltip-child-right",
                              children: S("bulk_messages_text"),
                            }),
                          ],
                        }),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          e &&
            f("div", {
              className: "flowsi-overlay",
              children: f("div", {
                className: "flowsi-overlay-content",
                children: f(Mg, { updateKanbanColumn: i, setActiveOverlay: n }),
              }),
            }),
          r &&
            f("div", {
              onClick: (l) => {
                l.target === l.currentTarget && n(null);
              },
              className: "flowsi-side-overlay-fill",
              children: f("div", {
                className: "flowsi-side-overlay-container",
                children: f(Zg, { type: r, setActiveOverlay: n }),
              }),
            }),
        ],
      })
    );
  };
function cm() {
  return f(Ce, { children: f(lm, {}) });
}
const um = ({ children: e }) => {
  const t = Ya((r) => r.theme);
  return (
    x.exports.useEffect(() => {
      document.documentElement.setAttribute("flowsi-theme", t);
    }, [t]),
    f(Ce, { children: e })
  );
};
var dm = {
    mqtt: function (e, t, r) {
      (function (n, i) {
        e.exports = i();
      })(0, function () {
        var n = (function (i) {
          var o = "@VERSION@-@BUILDLEVEL@",
            a =
              i.localStorage ||
              (function () {
                var m = {};
                return {
                  setItem: function (v, b) {
                    m[v] = b;
                  },
                  getItem: function (v) {
                    return m[v];
                  },
                  removeItem: function (v) {
                    delete m[v];
                  },
                };
              })(),
            s = {
              CONNECT: 1,
              CONNACK: 2,
              PUBLISH: 3,
              PUBACK: 4,
              PUBREC: 5,
              PUBREL: 6,
              PUBCOMP: 7,
              SUBSCRIBE: 8,
              SUBACK: 9,
              UNSUBSCRIBE: 10,
              UNSUBACK: 11,
              PINGREQ: 12,
              PINGRESP: 13,
              DISCONNECT: 14,
            },
            u = function (m, v) {
              for (var b in m)
                if (m.hasOwnProperty(b)) {
                  if (!v.hasOwnProperty(b)) {
                    var E =
                      "Unknown property, " + b + ". Valid properties are:";
                    for (var R in v) v.hasOwnProperty(R) && (E = E + " " + R);
                    throw new Error(E);
                  }
                  if (typeof m[b] !== v[b])
                    throw new Error(l(c.INVALID_TYPE, [typeof m[b], b]));
                }
            },
            d = function (m, v) {
              return function () {
                return m.apply(v, arguments);
              };
            },
            c = {
              OK: { code: 0, text: "AMQJSC0000I OK." },
              CONNECT_TIMEOUT: {
                code: 1,
                text: "AMQJSC0001E Connect timed out.",
              },
              SUBSCRIBE_TIMEOUT: {
                code: 2,
                text: "AMQJS0002E Subscribe timed out.",
              },
              UNSUBSCRIBE_TIMEOUT: {
                code: 3,
                text: "AMQJS0003E Unsubscribe timed out.",
              },
              PING_TIMEOUT: { code: 4, text: "AMQJS0004E Ping timed out." },
              INTERNAL_ERROR: {
                code: 5,
                text: "AMQJS0005E Internal error. Error Message: {0}, Stack trace: {1}",
              },
              CONNACK_RETURNCODE: {
                code: 6,
                text: "AMQJS0006E Bad Connack return code:{0} {1}.",
              },
              SOCKET_ERROR: { code: 7, text: "AMQJS0007E Socket error:{0}." },
              SOCKET_CLOSE: { code: 8, text: "AMQJS0008I Socket closed." },
              MALFORMED_UTF: {
                code: 9,
                text: "AMQJS0009E Malformed UTF data:{0} {1} {2}.",
              },
              UNSUPPORTED: {
                code: 10,
                text: "AMQJS0010E {0} is not supported by this browser.",
              },
              INVALID_STATE: {
                code: 11,
                text: "AMQJS0011E Invalid state {0}.",
              },
              INVALID_TYPE: {
                code: 12,
                text: "AMQJS0012E Invalid type {0} for {1}.",
              },
              INVALID_ARGUMENT: {
                code: 13,
                text: "AMQJS0013E Invalid argument {0} for {1}.",
              },
              UNSUPPORTED_OPERATION: {
                code: 14,
                text: "AMQJS0014E Unsupported operation.",
              },
              INVALID_STORED_DATA: {
                code: 15,
                text: "AMQJS0015E Invalid data in local storage key={0} value={1}.",
              },
              INVALID_MQTT_MESSAGE_TYPE: {
                code: 16,
                text: "AMQJS0016E Invalid MQTT message type {0}.",
              },
              MALFORMED_UNICODE: {
                code: 17,
                text: "AMQJS0017E Malformed Unicode string:{0} {1}.",
              },
              BUFFER_FULL: {
                code: 18,
                text: "AMQJS0018E Message buffer is full, maximum buffer size: {0}.",
              },
            },
            p = {
              0: "Connection Accepted",
              1: "Connection Refused: unacceptable protocol version",
              2: "Connection Refused: identifier rejected",
              3: "Connection Refused: server unavailable",
              4: "Connection Refused: bad user name or password",
              5: "Connection Refused: not authorized",
            },
            l = function (m, v) {
              var b = m.text;
              if (v) {
                for (var E, R, T = 0; T < v.length; T++)
                  if (((E = "{" + T + "}"), (R = b.indexOf(E)), R > 0)) {
                    var L = b.substring(0, R),
                      j = b.substring(R + E.length);
                    b = L + v[T] + j;
                  }
              }
              return b;
            },
            g = [0, 6, 77, 81, 73, 115, 100, 112, 3],
            h = [0, 4, 77, 81, 84, 84, 4],
            y = function (m, v) {
              for (var b in ((this.type = m), v))
                v.hasOwnProperty(b) && (this[b] = v[b]);
            };
          function D(m, v) {
            var b,
              E = v,
              R = m[v],
              T = R >> 4,
              L = (R &= 15);
            v += 1;
            var j = 0,
              $ = 1;
            do {
              if (v == m.length) return [null, E];
              ((b = m[v++]), (j += (127 & b) * $), ($ *= 128));
            } while ((128 & b) !== 0);
            var K = v + j;
            if (K > m.length) return [null, E];
            var G = new y(T);
            switch (T) {
              case s.CONNACK:
                var A = m[v++];
                (1 & A && (G.sessionPresent = !0), (G.returnCode = m[v++]));
                break;
              case s.PUBLISH:
                var J = (L >> 1) & 3,
                  Z = P(m, v);
                v += 2;
                var le = W(m, v, Z);
                ((v += Z),
                  J > 0 && ((G.messageIdentifier = P(m, v)), (v += 2)));
                var ee = new q(m.subarray(v, K));
                ((1 & L) == 1 && (ee.retained = !0),
                  (8 & L) == 8 && (ee.duplicate = !0),
                  (ee.qos = J),
                  (ee.destinationName = le),
                  (G.payloadMessage = ee));
                break;
              case s.PUBACK:
              case s.PUBREC:
              case s.PUBREL:
              case s.PUBCOMP:
              case s.UNSUBACK:
                G.messageIdentifier = P(m, v);
                break;
              case s.SUBACK:
                ((G.messageIdentifier = P(m, v)),
                  (v += 2),
                  (G.returnCode = m.subarray(v, K)));
                break;
            }
            return [G, K];
          }
          function C(m, v, b) {
            return ((v[b++] = m >> 8), (v[b++] = m % 256), b);
          }
          function w(m, v, b, E) {
            return ((E = C(v, b, E)), B(m, b, E), E + v);
          }
          function P(m, v) {
            return 256 * m[v] + m[v + 1];
          }
          function _(m) {
            var v = new Array(1),
              b = 0;
            do {
              var E = m % 128;
              ((m >>= 7), m > 0 && (E |= 128), (v[b++] = E));
            } while (m > 0 && b < 4);
            return v;
          }
          function N(m) {
            for (var v = 0, b = 0; b < m.length; b++) {
              var E = m.charCodeAt(b);
              E > 2047
                ? (55296 <= E && E <= 56319 && (b++, v++), (v += 3))
                : E > 127
                  ? (v += 2)
                  : v++;
            }
            return v;
          }
          function B(m, v, b) {
            for (var E = b, R = 0; R < m.length; R++) {
              var T = m.charCodeAt(R);
              if (55296 <= T && T <= 56319) {
                var L = m.charCodeAt(++R);
                if (isNaN(L)) throw new Error(l(c.MALFORMED_UNICODE, [T, L]));
                T = L - 56320 + ((T - 55296) << 10) + 65536;
              }
              T <= 127
                ? (v[E++] = T)
                : T <= 2047
                  ? ((v[E++] = ((T >> 6) & 31) | 192),
                    (v[E++] = (63 & T) | 128))
                  : T <= 65535
                    ? ((v[E++] = ((T >> 12) & 15) | 224),
                      (v[E++] = ((T >> 6) & 63) | 128),
                      (v[E++] = (63 & T) | 128))
                    : ((v[E++] = ((T >> 18) & 7) | 240),
                      (v[E++] = ((T >> 12) & 63) | 128),
                      (v[E++] = ((T >> 6) & 63) | 128),
                      (v[E++] = (63 & T) | 128));
            }
            return v;
          }
          function W(m, v, b) {
            for (var E, R = "", T = v; T < v + b;) {
              var L = m[T++];
              if (L < 128) E = L;
              else {
                var j = m[T++] - 128;
                if (j < 0)
                  throw new Error(
                    l(c.MALFORMED_UTF, [L.toString(16), j.toString(16), ""]),
                  );
                if (L < 224) E = 64 * (L - 192) + j;
                else {
                  var $ = m[T++] - 128;
                  if ($ < 0)
                    throw new Error(
                      l(c.MALFORMED_UTF, [
                        L.toString(16),
                        j.toString(16),
                        $.toString(16),
                      ]),
                    );
                  if (L < 240) E = 4096 * (L - 224) + 64 * j + $;
                  else {
                    var K = m[T++] - 128;
                    if (K < 0)
                      throw new Error(
                        l(c.MALFORMED_UTF, [
                          L.toString(16),
                          j.toString(16),
                          $.toString(16),
                          K.toString(16),
                        ]),
                      );
                    if (!(L < 248))
                      throw new Error(
                        l(c.MALFORMED_UTF, [
                          L.toString(16),
                          j.toString(16),
                          $.toString(16),
                          K.toString(16),
                        ]),
                      );
                    E = 262144 * (L - 240) + 4096 * j + 64 * $ + K;
                  }
                }
              }
              (E > 65535 &&
                ((E -= 65536),
                (R += String.fromCharCode(55296 + (E >> 10))),
                (E = 56320 + (1023 & E))),
                (R += String.fromCharCode(E)));
            }
            return R;
          }
          y.prototype.encode = function () {
            var m,
              v = (15 & this.type) << 4,
              b = 0,
              E = [],
              R = 0;
            switch (
              (this.messageIdentifier !== void 0 && (b += 2), this.type)
            ) {
              case s.CONNECT:
                switch (this.mqttVersion) {
                  case 3:
                    b += g.length + 3;
                    break;
                  case 4:
                    b += h.length + 3;
                    break;
                }
                ((b += N(this.clientId) + 2),
                  this.willMessage !== void 0 &&
                    ((b += N(this.willMessage.destinationName) + 2),
                    (m = this.willMessage.payloadBytes),
                    m instanceof Uint8Array || (m = new Uint8Array(L)),
                    (b += m.byteLength + 2)),
                  this.userName !== void 0 && (b += N(this.userName) + 2),
                  this.password !== void 0 && (b += N(this.password) + 2));
                break;
              case s.SUBSCRIBE:
                v |= 2;
                for (var T = 0; T < this.topics.length; T++)
                  ((E[T] = N(this.topics[T])), (b += E[T] + 2));
                b += this.requestedQos.length;
                break;
              case s.UNSUBSCRIBE:
                for (v |= 2, T = 0; T < this.topics.length; T++)
                  ((E[T] = N(this.topics[T])), (b += E[T] + 2));
                break;
              case s.PUBREL:
                v |= 2;
                break;
              case s.PUBLISH:
                (this.payloadMessage.duplicate && (v |= 8),
                  (v = v |= this.payloadMessage.qos << 1),
                  this.payloadMessage.retained && (v |= 1),
                  (R = N(this.payloadMessage.destinationName)),
                  (b += R + 2));
                var L = this.payloadMessage.payloadBytes;
                ((b += L.byteLength),
                  L instanceof ArrayBuffer
                    ? (L = new Uint8Array(L))
                    : L instanceof Uint8Array ||
                      (L = new Uint8Array(L.buffer)));
                break;
            }
            var j = _(b),
              $ = j.length + 1,
              K = new ArrayBuffer(b + $),
              G = new Uint8Array(K);
            if (((G[0] = v), G.set(j, 1), this.type == s.PUBLISH))
              $ = w(this.payloadMessage.destinationName, R, G, $);
            else if (this.type == s.CONNECT) {
              switch (this.mqttVersion) {
                case 3:
                  (G.set(g, $), ($ += g.length));
                  break;
                case 4:
                  (G.set(h, $), ($ += h.length));
                  break;
              }
              var A = 0;
              (this.cleanSession && (A = 2),
                this.willMessage !== void 0 &&
                  ((A |= 4),
                  (A |= this.willMessage.qos << 3),
                  this.willMessage.retained && (A |= 32)),
                this.userName !== void 0 && (A |= 128),
                this.password !== void 0 && (A |= 64),
                (G[$++] = A),
                ($ = C(this.keepAliveInterval, G, $)));
            }
            switch (
              (this.messageIdentifier !== void 0 &&
                ($ = C(this.messageIdentifier, G, $)),
              this.type)
            ) {
              case s.CONNECT:
                (($ = w(this.clientId, N(this.clientId), G, $)),
                  this.willMessage !== void 0 &&
                    (($ = w(
                      this.willMessage.destinationName,
                      N(this.willMessage.destinationName),
                      G,
                      $,
                    )),
                    ($ = C(m.byteLength, G, $)),
                    G.set(m, $),
                    ($ += m.byteLength)),
                  this.userName !== void 0 &&
                    ($ = w(this.userName, N(this.userName), G, $)),
                  this.password !== void 0 &&
                    ($ = w(this.password, N(this.password), G, $)));
                break;
              case s.PUBLISH:
                G.set(L, $);
                break;
              case s.SUBSCRIBE:
                for (T = 0; T < this.topics.length; T++)
                  (($ = w(this.topics[T], E[T], G, $)),
                    (G[$++] = this.requestedQos[T]));
                break;
              case s.UNSUBSCRIBE:
                for (T = 0; T < this.topics.length; T++)
                  $ = w(this.topics[T], E[T], G, $);
                break;
            }
            return K;
          };
          var X = function (m, v) {
              ((this._client = m),
                (this._keepAliveInterval = 1e3 * v),
                (this.isReset = !1));
              var b = new y(s.PINGREQ).encode(),
                E = function (T) {
                  return function () {
                    return R.apply(T);
                  };
                },
                R = function () {
                  this.isReset
                    ? ((this.isReset = !1),
                      this._client._trace("Pinger.doPing", "send PINGREQ"),
                      this._client.socket.send(b),
                      (this.timeout = setTimeout(
                        E(this),
                        this._keepAliveInterval,
                      )))
                    : (this._client._trace("Pinger.doPing", "Timed out"),
                      this._client._disconnected(
                        c.PING_TIMEOUT.code,
                        l(c.PING_TIMEOUT),
                      ));
                };
              ((this.reset = function () {
                ((this.isReset = !0),
                  clearTimeout(this.timeout),
                  this._keepAliveInterval > 0 &&
                    (this.timeout = setTimeout(
                      E(this),
                      this._keepAliveInterval,
                    )));
              }),
                (this.cancel = function () {
                  clearTimeout(this.timeout);
                }));
            },
            V = function (m, v, b, E) {
              v || (v = 30);
              var R = function (T, L, j) {
                return function () {
                  return T.apply(L, j);
                };
              };
              ((this.timeout = setTimeout(R(b, m, E), 1e3 * v)),
                (this.cancel = function () {
                  clearTimeout(this.timeout);
                }));
            },
            k = function (m, v, b, E, R) {
              if (!("WebSocket" in i) || i.WebSocket === null)
                throw new Error(l(c.UNSUPPORTED, ["WebSocket"]));
              if (!("ArrayBuffer" in i) || i.ArrayBuffer === null)
                throw new Error(l(c.UNSUPPORTED, ["ArrayBuffer"]));
              for (var T in (this._trace("Paho.Client", m, v, b, E, R),
              (this.host = v),
              (this.port = b),
              (this.path = E),
              (this.uri = m),
              (this.clientId = R),
              (this._wsuri = null),
              (this._localKey =
                v + ":" + b + (E != "/mqtt" ? ":" + E : "") + ":" + R + ":"),
              (this._msg_queue = []),
              (this._buffered_msg_queue = []),
              (this._sentMessages = {}),
              (this._receivedMessages = {}),
              (this._notify_msg_sent = {}),
              (this._message_identifier = 1),
              (this._sequence = 0),
              a))
                (T.indexOf("Sent:" + this._localKey) !== 0 &&
                  T.indexOf("Received:" + this._localKey) !== 0) ||
                  this.restore(T);
            };
          ((k.prototype.host = null),
            (k.prototype.port = null),
            (k.prototype.path = null),
            (k.prototype.uri = null),
            (k.prototype.clientId = null),
            (k.prototype.socket = null),
            (k.prototype.connected = !1),
            (k.prototype.maxMessageIdentifier = 65536),
            (k.prototype.connectOptions = null),
            (k.prototype.hostIndex = null),
            (k.prototype.onConnected = null),
            (k.prototype.onConnectionLost = null),
            (k.prototype.onMessageDelivered = null),
            (k.prototype.onMessageArrived = null),
            (k.prototype.traceFunction = null),
            (k.prototype._msg_queue = null),
            (k.prototype._buffered_msg_queue = null),
            (k.prototype._connectTimeout = null),
            (k.prototype.sendPinger = null),
            (k.prototype.receivePinger = null),
            (k.prototype._reconnectInterval = 1),
            (k.prototype._reconnecting = !1),
            (k.prototype._reconnectTimeout = null),
            (k.prototype.disconnectedPublishing = !1),
            (k.prototype.disconnectedBufferSize = 5e3),
            (k.prototype.receiveBuffer = null),
            (k.prototype._traceBuffer = null),
            (k.prototype._MAX_TRACE_ENTRIES = 100),
            (k.prototype.connect = function (m) {
              var v = this._traceMask(m, "password");
              if (
                (this._trace("Client.connect", v, this.socket, this.connected),
                this.connected)
              )
                throw new Error(l(c.INVALID_STATE, ["already connected"]));
              if (this.socket)
                throw new Error(l(c.INVALID_STATE, ["already connected"]));
              (this._reconnecting &&
                (this._reconnectTimeout.cancel(),
                (this._reconnectTimeout = null),
                (this._reconnecting = !1)),
                (this.connectOptions = m),
                (this._reconnectInterval = 1),
                (this._reconnecting = !1),
                m.uris
                  ? ((this.hostIndex = 0), this._doConnect(m.uris[0]))
                  : this._doConnect(this.uri));
            }),
            (k.prototype.subscribe = function (m, v) {
              if ((this._trace("Client.subscribe", m, v), !this.connected))
                throw new Error(l(c.INVALID_STATE, ["not connected"]));
              var b = new y(s.SUBSCRIBE);
              ((b.topics = m.constructor === Array ? m : [m]),
                v.qos === void 0 && (v.qos = 0),
                (b.requestedQos = []));
              for (var E = 0; E < b.topics.length; E++)
                b.requestedQos[E] = v.qos;
              (v.onSuccess &&
                (b.onSuccess = function (R) {
                  v.onSuccess({
                    invocationContext: v.invocationContext,
                    grantedQos: R,
                  });
                }),
                v.onFailure &&
                  (b.onFailure = function (R) {
                    v.onFailure({
                      invocationContext: v.invocationContext,
                      errorCode: R,
                      errorMessage: l(R),
                    });
                  }),
                v.timeout &&
                  (b.timeOut = new V(this, v.timeout, v.onFailure, [
                    {
                      invocationContext: v.invocationContext,
                      errorCode: c.SUBSCRIBE_TIMEOUT.code,
                      errorMessage: l(c.SUBSCRIBE_TIMEOUT),
                    },
                  ])),
                this._requires_ack(b),
                this._schedule_message(b));
            }),
            (k.prototype.unsubscribe = function (m, v) {
              if ((this._trace("Client.unsubscribe", m, v), !this.connected))
                throw new Error(l(c.INVALID_STATE, ["not connected"]));
              var b = new y(s.UNSUBSCRIBE);
              ((b.topics = m.constructor === Array ? m : [m]),
                v.onSuccess &&
                  (b.callback = function () {
                    v.onSuccess({ invocationContext: v.invocationContext });
                  }),
                v.timeout &&
                  (b.timeOut = new V(this, v.timeout, v.onFailure, [
                    {
                      invocationContext: v.invocationContext,
                      errorCode: c.UNSUBSCRIBE_TIMEOUT.code,
                      errorMessage: l(c.UNSUBSCRIBE_TIMEOUT),
                    },
                  ])),
                this._requires_ack(b),
                this._schedule_message(b));
            }),
            (k.prototype.send = function (m) {
              this._trace("Client.send", m);
              var v = new y(s.PUBLISH);
              if (((v.payloadMessage = m), this.connected))
                (m.qos > 0
                  ? this._requires_ack(v)
                  : this.onMessageDelivered &&
                    (this._notify_msg_sent[v] = this.onMessageDelivered(
                      v.payloadMessage,
                    )),
                  this._schedule_message(v));
              else {
                if (!this._reconnecting || !this.disconnectedPublishing)
                  throw new Error(l(c.INVALID_STATE, ["not connected"]));
                var b =
                  Object.keys(this._sentMessages).length +
                  this._buffered_msg_queue.length;
                if (b > this.disconnectedBufferSize)
                  throw new Error(
                    l(c.BUFFER_FULL, [this.disconnectedBufferSize]),
                  );
                m.qos > 0
                  ? this._requires_ack(v)
                  : ((v.sequence = ++this._sequence),
                    this._buffered_msg_queue.unshift(v));
              }
            }),
            (k.prototype.disconnect = function () {
              if (
                (this._trace("Client.disconnect"),
                this._reconnecting &&
                  (this._reconnectTimeout.cancel(),
                  (this._reconnectTimeout = null),
                  (this._reconnecting = !1)),
                !this.socket)
              )
                throw new Error(
                  l(c.INVALID_STATE, ["not connecting or connected"]),
                );
              var m = new y(s.DISCONNECT);
              ((this._notify_msg_sent[m] = d(this._disconnected, this)),
                this._schedule_message(m));
            }),
            (k.prototype.getTraceLog = function () {
              if (this._traceBuffer !== null) {
                for (var m in (this._trace("Client.getTraceLog", new Date()),
                this._trace(
                  "Client.getTraceLog in flight messages",
                  this._sentMessages.length,
                ),
                this._sentMessages))
                  this._trace("_sentMessages ", m, this._sentMessages[m]);
                for (var m in this._receivedMessages)
                  this._trace(
                    "_receivedMessages ",
                    m,
                    this._receivedMessages[m],
                  );
                return this._traceBuffer;
              }
            }),
            (k.prototype.startTrace = function () {
              (this._traceBuffer === null && (this._traceBuffer = []),
                this._trace("Client.startTrace", new Date(), o));
            }),
            (k.prototype.stopTrace = function () {
              delete this._traceBuffer;
            }),
            (k.prototype._doConnect = function (m) {
              if (this.connectOptions.useSSL) {
                var v = m.split(":");
                ((v[0] = "wss"), (m = v.join(":")));
              }
              ((this._wsuri = m),
                (this.connected = !1),
                this.connectOptions.mqttVersion < 4
                  ? (this.socket = new WebSocket(m))
                  : (this.socket = new WebSocket(m, ["mqtt"])),
                (this.socket.binaryType = "arraybuffer"),
                (this.socket.onopen = d(this._on_socket_open, this)),
                (this.socket.onmessage = d(this._on_socket_message, this)),
                (this.socket.onerror = d(this._on_socket_error, this)),
                (this.socket.onclose = d(this._on_socket_close, this)),
                (this.sendPinger = new X(
                  this,
                  this.connectOptions.keepAliveInterval,
                )),
                (this.receivePinger = new X(
                  this,
                  this.connectOptions.keepAliveInterval,
                )),
                this._connectTimeout &&
                  (this._connectTimeout.cancel(),
                  (this._connectTimeout = null)),
                (this._connectTimeout = new V(
                  this,
                  this.connectOptions.timeout,
                  this._disconnected,
                  [c.CONNECT_TIMEOUT.code, l(c.CONNECT_TIMEOUT)],
                )));
            }),
            (k.prototype._schedule_message = function (m) {
              (this._msg_queue.unshift(m),
                this.connected && this._process_queue());
            }),
            (k.prototype.store = function (m, v) {
              var b = {
                type: v.type,
                messageIdentifier: v.messageIdentifier,
                version: 1,
              };
              switch (v.type) {
                case s.PUBLISH:
                  (v.pubRecReceived && (b.pubRecReceived = !0),
                    (b.payloadMessage = {}));
                  for (
                    var E = "", R = v.payloadMessage.payloadBytes, T = 0;
                    T < R.length;
                    T++
                  )
                    R[T] <= 15
                      ? (E = E + "0" + R[T].toString(16))
                      : (E += R[T].toString(16));
                  ((b.payloadMessage.payloadHex = E),
                    (b.payloadMessage.qos = v.payloadMessage.qos),
                    (b.payloadMessage.destinationName =
                      v.payloadMessage.destinationName),
                    v.payloadMessage.duplicate &&
                      (b.payloadMessage.duplicate = !0),
                    v.payloadMessage.retained &&
                      (b.payloadMessage.retained = !0),
                    m.indexOf("Sent:") === 0 &&
                      (v.sequence === void 0 && (v.sequence = ++this._sequence),
                      (b.sequence = v.sequence)));
                  break;
                default:
                  throw Error(
                    l(c.INVALID_STORED_DATA, [
                      m + this._localKey + v.messageIdentifier,
                      b,
                    ]),
                  );
              }
              a.setItem(
                m + this._localKey + v.messageIdentifier,
                JSON.stringify(b),
              );
            }),
            (k.prototype.restore = function (m) {
              var v = a.getItem(m),
                b = JSON.parse(v),
                E = new y(b.type, b);
              switch (b.type) {
                case s.PUBLISH:
                  for (
                    var R = b.payloadMessage.payloadHex,
                      T = new ArrayBuffer(R.length / 2),
                      L = new Uint8Array(T),
                      j = 0;
                    R.length >= 2;
                  ) {
                    var $ = parseInt(R.substring(0, 2), 16);
                    ((R = R.substring(2, R.length)), (L[j++] = $));
                  }
                  var K = new q(L);
                  ((K.qos = b.payloadMessage.qos),
                    (K.destinationName = b.payloadMessage.destinationName),
                    b.payloadMessage.duplicate && (K.duplicate = !0),
                    b.payloadMessage.retained && (K.retained = !0),
                    (E.payloadMessage = K));
                  break;
                default:
                  throw Error(l(c.INVALID_STORED_DATA, [m, v]));
              }
              m.indexOf("Sent:" + this._localKey) === 0
                ? ((E.payloadMessage.duplicate = !0),
                  (this._sentMessages[E.messageIdentifier] = E))
                : m.indexOf("Received:" + this._localKey) === 0 &&
                  (this._receivedMessages[E.messageIdentifier] = E);
            }),
            (k.prototype._process_queue = function () {
              for (var m = null; (m = this._msg_queue.pop());)
                (this._socket_send(m),
                  this._notify_msg_sent[m] &&
                    (this._notify_msg_sent[m](),
                    delete this._notify_msg_sent[m]));
            }),
            (k.prototype._requires_ack = function (m) {
              var v = Object.keys(this._sentMessages).length;
              if (v > this.maxMessageIdentifier)
                throw Error("Too many messages:" + v);
              for (; this._sentMessages[this._message_identifier] !== void 0;)
                this._message_identifier++;
              ((m.messageIdentifier = this._message_identifier),
                (this._sentMessages[m.messageIdentifier] = m),
                m.type === s.PUBLISH && this.store("Sent:", m),
                this._message_identifier === this.maxMessageIdentifier &&
                  (this._message_identifier = 1));
            }),
            (k.prototype._on_socket_open = function () {
              var m = new y(s.CONNECT, this.connectOptions);
              ((m.clientId = this.clientId), this._socket_send(m));
            }),
            (k.prototype._on_socket_message = function (m) {
              this._trace("Client._on_socket_message", m.data);
              for (
                var v = this._deframeMessages(m.data), b = 0;
                b < v.length;
                b += 1
              )
                this._handleMessage(v[b]);
            }),
            (k.prototype._deframeMessages = function (m) {
              var v = new Uint8Array(m),
                b = [];
              if (this.receiveBuffer) {
                var E = new Uint8Array(this.receiveBuffer.length + v.length);
                (E.set(this.receiveBuffer),
                  E.set(v, this.receiveBuffer.length),
                  (v = E),
                  delete this.receiveBuffer);
              }
              try {
                for (var R = 0; R < v.length;) {
                  var T = D(v, R),
                    L = T[0];
                  if (((R = T[1]), L === null)) break;
                  b.push(L);
                }
                R < v.length && (this.receiveBuffer = v.subarray(R));
              } catch ($) {
                var j =
                  $.hasOwnProperty("stack") == "undefined"
                    ? $.stack.toString()
                    : "No Error Stack Available";
                return void this._disconnected(
                  c.INTERNAL_ERROR.code,
                  l(c.INTERNAL_ERROR, [$.message, j]),
                );
              }
              return b;
            }),
            (k.prototype._handleMessage = function (m) {
              this._trace("Client._handleMessage", m);
              try {
                switch (m.type) {
                  case s.CONNACK:
                    if (
                      (this._connectTimeout.cancel(),
                      this._reconnectTimeout && this._reconnectTimeout.cancel(),
                      this.connectOptions.cleanSession)
                    ) {
                      for (var v in this._sentMessages) {
                        var b = this._sentMessages[v];
                        a.removeItem(
                          "Sent:" + this._localKey + b.messageIdentifier,
                        );
                      }
                      for (var v in ((this._sentMessages = {}),
                      this._receivedMessages)) {
                        var E = this._receivedMessages[v];
                        a.removeItem(
                          "Received:" + this._localKey + E.messageIdentifier,
                        );
                      }
                      this._receivedMessages = {};
                    }
                    if (m.returnCode !== 0) {
                      this._disconnected(
                        c.CONNACK_RETURNCODE.code,
                        l(c.CONNACK_RETURNCODE, [
                          m.returnCode,
                          p[m.returnCode],
                        ]),
                      );
                      break;
                    }
                    ((this.connected = !0),
                      this.connectOptions.uris &&
                        (this.hostIndex = this.connectOptions.uris.length));
                    var R = [];
                    for (var T in this._sentMessages)
                      this._sentMessages.hasOwnProperty(T) &&
                        R.push(this._sentMessages[T]);
                    if (this._buffered_msg_queue.length > 0)
                      for (var L = null; (L = this._buffered_msg_queue.pop());)
                        (R.push(L),
                          this.onMessageDelivered &&
                            (this._notify_msg_sent[L] = this.onMessageDelivered(
                              L.payloadMessage,
                            )));
                    R = R.sort(function (Z, le) {
                      return Z.sequence - le.sequence;
                    });
                    for (var j = 0, $ = R.length; j < $; j++)
                      if (
                        ((b = R[j]), b.type == s.PUBLISH && b.pubRecReceived)
                      ) {
                        var K = new y(s.PUBREL, {
                          messageIdentifier: b.messageIdentifier,
                        });
                        this._schedule_message(K);
                      } else this._schedule_message(b);
                    this.connectOptions.onSuccess &&
                      this.connectOptions.onSuccess({
                        invocationContext:
                          this.connectOptions.invocationContext,
                      });
                    var G = !1;
                    (this._reconnecting &&
                      ((G = !0),
                      (this._reconnectInterval = 1),
                      (this._reconnecting = !1)),
                      this._connected(G, this._wsuri),
                      this._process_queue());
                    break;
                  case s.PUBLISH:
                    this._receivePublish(m);
                    break;
                  case s.PUBACK:
                    ((b = this._sentMessages[m.messageIdentifier]),
                      b &&
                        (delete this._sentMessages[m.messageIdentifier],
                        a.removeItem(
                          "Sent:" + this._localKey + m.messageIdentifier,
                        ),
                        this.onMessageDelivered &&
                          this.onMessageDelivered(b.payloadMessage)));
                    break;
                  case s.PUBREC:
                    ((b = this._sentMessages[m.messageIdentifier]),
                      b &&
                        ((b.pubRecReceived = !0),
                        (K = new y(s.PUBREL, {
                          messageIdentifier: m.messageIdentifier,
                        })),
                        this.store("Sent:", b),
                        this._schedule_message(K)));
                    break;
                  case s.PUBREL:
                    ((E = this._receivedMessages[m.messageIdentifier]),
                      a.removeItem(
                        "Received:" + this._localKey + m.messageIdentifier,
                      ),
                      E &&
                        (this._receiveMessage(E),
                        delete this._receivedMessages[m.messageIdentifier]));
                    var A = new y(s.PUBCOMP, {
                      messageIdentifier: m.messageIdentifier,
                    });
                    this._schedule_message(A);
                    break;
                  case s.PUBCOMP:
                    ((b = this._sentMessages[m.messageIdentifier]),
                      delete this._sentMessages[m.messageIdentifier],
                      a.removeItem(
                        "Sent:" + this._localKey + m.messageIdentifier,
                      ),
                      this.onMessageDelivered &&
                        this.onMessageDelivered(b.payloadMessage));
                    break;
                  case s.SUBACK:
                    ((b = this._sentMessages[m.messageIdentifier]),
                      b &&
                        (b.timeOut && b.timeOut.cancel(),
                        m.returnCode[0] === 128
                          ? b.onFailure && b.onFailure(m.returnCode)
                          : b.onSuccess && b.onSuccess(m.returnCode),
                        delete this._sentMessages[m.messageIdentifier]));
                    break;
                  case s.UNSUBACK:
                    ((b = this._sentMessages[m.messageIdentifier]),
                      b &&
                        (b.timeOut && b.timeOut.cancel(),
                        b.callback && b.callback(),
                        delete this._sentMessages[m.messageIdentifier]));
                    break;
                  case s.PINGRESP:
                    this.sendPinger.reset();
                    break;
                  case s.DISCONNECT:
                    this._disconnected(
                      c.INVALID_MQTT_MESSAGE_TYPE.code,
                      l(c.INVALID_MQTT_MESSAGE_TYPE, [m.type]),
                    );
                    break;
                  default:
                    this._disconnected(
                      c.INVALID_MQTT_MESSAGE_TYPE.code,
                      l(c.INVALID_MQTT_MESSAGE_TYPE, [m.type]),
                    );
                }
              } catch (Z) {
                var J =
                  Z.hasOwnProperty("stack") == "undefined"
                    ? Z.stack.toString()
                    : "No Error Stack Available";
                return void this._disconnected(
                  c.INTERNAL_ERROR.code,
                  l(c.INTERNAL_ERROR, [Z.message, J]),
                );
              }
            }),
            (k.prototype._on_socket_error = function (m) {
              this._reconnecting ||
                this._disconnected(
                  c.SOCKET_ERROR.code,
                  l(c.SOCKET_ERROR, [m.data]),
                );
            }),
            (k.prototype._on_socket_close = function () {
              this._reconnecting ||
                this._disconnected(c.SOCKET_CLOSE.code, l(c.SOCKET_CLOSE));
            }),
            (k.prototype._socket_send = function (m) {
              if (m.type == 1) {
                var v = this._traceMask(m, "password");
                this._trace("Client._socket_send", v);
              } else this._trace("Client._socket_send", m);
              (this.socket.send(m.encode()), this.sendPinger.reset());
            }),
            (k.prototype._receivePublish = function (m) {
              switch (m.payloadMessage.qos) {
                case "undefined":
                case 0:
                  this._receiveMessage(m);
                  break;
                case 1:
                  var v = new y(s.PUBACK, {
                    messageIdentifier: m.messageIdentifier,
                  });
                  (this._schedule_message(v), this._receiveMessage(m));
                  break;
                case 2:
                  ((this._receivedMessages[m.messageIdentifier] = m),
                    this.store("Received:", m));
                  var b = new y(s.PUBREC, {
                    messageIdentifier: m.messageIdentifier,
                  });
                  this._schedule_message(b);
                  break;
                default:
                  throw Error("Invaild qos=" + m.payloadMessage.qos);
              }
            }),
            (k.prototype._receiveMessage = function (m) {
              this.onMessageArrived && this.onMessageArrived(m.payloadMessage);
            }),
            (k.prototype._connected = function (m, v) {
              this.onConnected && this.onConnected(m, v);
            }),
            (k.prototype._reconnect = function () {
              (this._trace("Client._reconnect"),
                this.connected ||
                  ((this._reconnecting = !0),
                  this.sendPinger.cancel(),
                  this.receivePinger.cancel(),
                  this._reconnectInterval < 128 &&
                    (this._reconnectInterval = 2 * this._reconnectInterval),
                  this.connectOptions.uris
                    ? ((this.hostIndex = 0),
                      this._doConnect(this.connectOptions.uris[0]))
                    : this._doConnect(this.uri)));
            }),
            (k.prototype._disconnected = function (m, v) {
              if (
                (this._trace("Client._disconnected", m, v),
                m !== void 0 && this._reconnecting)
              )
                this._reconnectTimeout = new V(
                  this,
                  this._reconnectInterval,
                  this._reconnect,
                );
              else if (
                (this.sendPinger.cancel(),
                this.receivePinger.cancel(),
                this._connectTimeout &&
                  (this._connectTimeout.cancel(),
                  (this._connectTimeout = null)),
                (this._msg_queue = []),
                (this._buffered_msg_queue = []),
                (this._notify_msg_sent = {}),
                this.socket &&
                  ((this.socket.onopen = null),
                  (this.socket.onmessage = null),
                  (this.socket.onerror = null),
                  (this.socket.onclose = null),
                  this.socket.readyState === 1 && this.socket.close(),
                  delete this.socket),
                this.connectOptions.uris &&
                  this.hostIndex < this.connectOptions.uris.length - 1)
              )
                (this.hostIndex++,
                  this._doConnect(this.connectOptions.uris[this.hostIndex]));
              else if (
                (m === void 0 && ((m = c.OK.code), (v = l(c.OK))),
                this.connected)
              ) {
                if (
                  ((this.connected = !1),
                  this.onConnectionLost &&
                    this.onConnectionLost({
                      errorCode: m,
                      errorMessage: v,
                      reconnect: this.connectOptions.reconnect,
                      uri: this._wsuri,
                    }),
                  m !== c.OK.code && this.connectOptions.reconnect)
                )
                  return (
                    (this._reconnectInterval = 1),
                    void this._reconnect()
                  );
              } else
                this.connectOptions.mqttVersion === 4 &&
                this.connectOptions.mqttVersionExplicit === !1
                  ? (this._trace("Failed to connect V4, dropping back to V3"),
                    (this.connectOptions.mqttVersion = 3),
                    this.connectOptions.uris
                      ? ((this.hostIndex = 0),
                        this._doConnect(this.connectOptions.uris[0]))
                      : this._doConnect(this.uri))
                  : this.connectOptions.onFailure &&
                    this.connectOptions.onFailure({
                      invocationContext: this.connectOptions.invocationContext,
                      errorCode: m,
                      errorMessage: v,
                    });
            }),
            (k.prototype._trace = function () {
              if (this.traceFunction) {
                var m = Array.prototype.slice.call(arguments);
                for (var v in m)
                  typeof m[v] < "u" && m.splice(v, 1, JSON.stringify(m[v]));
                var b = m.join("");
                this.traceFunction({ severity: "Debug", message: b });
              }
              if (this._traceBuffer !== null)
                for (let E = 0; E < arguments.length; E++)
                  (this._traceBuffer.length === this._MAX_TRACE_ENTRIES &&
                    this._traceBuffer.shift(),
                    E === 0 || typeof arguments[E] > "u"
                      ? this._traceBuffer.push(arguments[E])
                      : this._traceBuffer.push(
                          "  " + JSON.stringify(arguments[E]),
                        ));
            }),
            (k.prototype._traceMask = function (m, v) {
              var b = {};
              for (var E in m)
                m.hasOwnProperty(E) && (b[E] = E == v ? "******" : m[E]);
              return b;
            }));
          var O = function (m, v, b, E) {
              var R;
              if (typeof m != "string")
                throw new Error(l(c.INVALID_TYPE, [typeof m, "host"]));
              if (arguments.length == 2) {
                ((E = v), (R = m));
                var T = R.match(
                  /^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/,
                );
                if (!T) throw new Error(l(c.INVALID_ARGUMENT, [m, "host"]));
                ((m = T[4] || T[2]), (v = parseInt(T[7])), (b = T[8]));
              } else {
                if (
                  (arguments.length == 3 && ((E = b), (b = "/mqtt")),
                  typeof v != "number" || v < 0)
                )
                  throw new Error(l(c.INVALID_TYPE, [typeof v, "port"]));
                if (typeof b != "string")
                  throw new Error(l(c.INVALID_TYPE, [typeof b, "path"]));
                var L =
                  m.indexOf(":") !== -1 &&
                  m.slice(0, 1) !== "[" &&
                  m.slice(-1) !== "]";
                R = "ws://" + (L ? "[" + m + "]" : m) + ":" + v + b;
              }
              for (var j = 0, $ = 0; $ < E.length; $++) {
                var K = E.charCodeAt($);
                (55296 <= K && K <= 56319 && $++, j++);
              }
              if (typeof E != "string" || j > 65535)
                throw new Error(l(c.INVALID_ARGUMENT, [E, "clientId"]));
              var G = new k(R, m, v, b, E);
              (Object.defineProperties(this, {
                host: {
                  get: function () {
                    return m;
                  },
                  set: function () {
                    throw new Error(l(c.UNSUPPORTED_OPERATION));
                  },
                },
                port: {
                  get: function () {
                    return v;
                  },
                  set: function () {
                    throw new Error(l(c.UNSUPPORTED_OPERATION));
                  },
                },
                path: {
                  get: function () {
                    return b;
                  },
                  set: function () {
                    throw new Error(l(c.UNSUPPORTED_OPERATION));
                  },
                },
                uri: {
                  get: function () {
                    return R;
                  },
                  set: function () {
                    throw new Error(l(c.UNSUPPORTED_OPERATION));
                  },
                },
                clientId: {
                  get: function () {
                    return G.clientId;
                  },
                  set: function () {
                    throw new Error(l(c.UNSUPPORTED_OPERATION));
                  },
                },
                onConnected: {
                  get: function () {
                    return G.onConnected;
                  },
                  set: function (A) {
                    if (typeof A != "function")
                      throw new Error(
                        l(c.INVALID_TYPE, [typeof A, "onConnected"]),
                      );
                    G.onConnected = A;
                  },
                },
                disconnectedPublishing: {
                  get: function () {
                    return G.disconnectedPublishing;
                  },
                  set: function (A) {
                    G.disconnectedPublishing = A;
                  },
                },
                disconnectedBufferSize: {
                  get: function () {
                    return G.disconnectedBufferSize;
                  },
                  set: function (A) {
                    G.disconnectedBufferSize = A;
                  },
                },
                onConnectionLost: {
                  get: function () {
                    return G.onConnectionLost;
                  },
                  set: function (A) {
                    if (typeof A != "function")
                      throw new Error(
                        l(c.INVALID_TYPE, [typeof A, "onConnectionLost"]),
                      );
                    G.onConnectionLost = A;
                  },
                },
                onMessageDelivered: {
                  get: function () {
                    return G.onMessageDelivered;
                  },
                  set: function (A) {
                    if (typeof A != "function")
                      throw new Error(
                        l(c.INVALID_TYPE, [typeof A, "onMessageDelivered"]),
                      );
                    G.onMessageDelivered = A;
                  },
                },
                onMessageArrived: {
                  get: function () {
                    return G.onMessageArrived;
                  },
                  set: function (A) {
                    if (typeof A != "function")
                      throw new Error(
                        l(c.INVALID_TYPE, [typeof A, "onMessageArrived"]),
                      );
                    G.onMessageArrived = A;
                  },
                },
                trace: {
                  get: function () {
                    return G.traceFunction;
                  },
                  set: function (A) {
                    if (typeof A != "function")
                      throw new Error(l(c.INVALID_TYPE, [typeof A, "onTrace"]));
                    G.traceFunction = A;
                  },
                },
              }),
                (this.connect = function (A) {
                  if (
                    ((A = A || {}),
                    u(A, {
                      timeout: "number",
                      userName: "string",
                      password: "string",
                      willMessage: "object",
                      keepAliveInterval: "number",
                      cleanSession: "boolean",
                      useSSL: "boolean",
                      invocationContext: "object",
                      onSuccess: "function",
                      onFailure: "function",
                      hosts: "object",
                      ports: "object",
                      reconnect: "boolean",
                      mqttVersion: "number",
                      mqttVersionExplicit: "boolean",
                      uris: "object",
                    }),
                    A.keepAliveInterval === void 0 &&
                      (A.keepAliveInterval = 60),
                    A.mqttVersion > 4 || A.mqttVersion < 3)
                  )
                    throw new Error(
                      l(c.INVALID_ARGUMENT, [
                        A.mqttVersion,
                        "connectOptions.mqttVersion",
                      ]),
                    );
                  if (
                    (A.mqttVersion === void 0
                      ? ((A.mqttVersionExplicit = !1), (A.mqttVersion = 4))
                      : (A.mqttVersionExplicit = !0),
                    A.password !== void 0 && A.userName === void 0)
                  )
                    throw new Error(
                      l(c.INVALID_ARGUMENT, [
                        A.password,
                        "connectOptions.password",
                      ]),
                    );
                  if (A.willMessage) {
                    if (!(A.willMessage instanceof q))
                      throw new Error(
                        l(c.INVALID_TYPE, [
                          A.willMessage,
                          "connectOptions.willMessage",
                        ]),
                      );
                    if (
                      ((A.willMessage.stringPayload = null),
                      typeof A.willMessage.destinationName > "u")
                    )
                      throw new Error(
                        l(c.INVALID_TYPE, [
                          typeof A.willMessage.destinationName,
                          "connectOptions.willMessage.destinationName",
                        ]),
                      );
                  }
                  if (
                    (typeof A.cleanSession > "u" && (A.cleanSession = !0),
                    A.hosts)
                  ) {
                    if (!(A.hosts instanceof Array))
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [
                          A.hosts,
                          "connectOptions.hosts",
                        ]),
                      );
                    if (A.hosts.length < 1)
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [
                          A.hosts,
                          "connectOptions.hosts",
                        ]),
                      );
                    for (var J = !1, Z = 0; Z < A.hosts.length; Z++) {
                      if (typeof A.hosts[Z] != "string")
                        throw new Error(
                          l(c.INVALID_TYPE, [
                            typeof A.hosts[Z],
                            "connectOptions.hosts[" + Z + "]",
                          ]),
                        );
                      if (
                        /^(wss?):\/\/((\[(.+)\])|([^\/]+?))(:(\d+))?(\/.*)$/.test(
                          A.hosts[Z],
                        )
                      ) {
                        if (Z === 0) J = !0;
                        else if (!J)
                          throw new Error(
                            l(c.INVALID_ARGUMENT, [
                              A.hosts[Z],
                              "connectOptions.hosts[" + Z + "]",
                            ]),
                          );
                      } else if (J)
                        throw new Error(
                          l(c.INVALID_ARGUMENT, [
                            A.hosts[Z],
                            "connectOptions.hosts[" + Z + "]",
                          ]),
                        );
                    }
                    if (J) A.uris = A.hosts;
                    else {
                      if (!A.ports)
                        throw new Error(
                          l(c.INVALID_ARGUMENT, [
                            A.ports,
                            "connectOptions.ports",
                          ]),
                        );
                      if (!(A.ports instanceof Array))
                        throw new Error(
                          l(c.INVALID_ARGUMENT, [
                            A.ports,
                            "connectOptions.ports",
                          ]),
                        );
                      if (A.hosts.length !== A.ports.length)
                        throw new Error(
                          l(c.INVALID_ARGUMENT, [
                            A.ports,
                            "connectOptions.ports",
                          ]),
                        );
                      for (A.uris = [], Z = 0; Z < A.hosts.length; Z++) {
                        if (typeof A.ports[Z] != "number" || A.ports[Z] < 0)
                          throw new Error(
                            l(c.INVALID_TYPE, [
                              typeof A.ports[Z],
                              "connectOptions.ports[" + Z + "]",
                            ]),
                          );
                        var le = A.hosts[Z],
                          ee = A.ports[Z],
                          _e = le.indexOf(":") !== -1;
                        ((R =
                          "ws://" + (_e ? "[" + le + "]" : le) + ":" + ee + b),
                          A.uris.push(R));
                      }
                    }
                  }
                  G.connect(A);
                }),
                (this.subscribe = function (A, J) {
                  if (typeof A != "string" && A.constructor !== Array)
                    throw new Error("Invalid argument:" + A);
                  if (
                    ((J = J || {}),
                    u(J, {
                      qos: "number",
                      invocationContext: "object",
                      onSuccess: "function",
                      onFailure: "function",
                      timeout: "number",
                    }),
                    J.timeout && !J.onFailure)
                  )
                    throw new Error(
                      "subscribeOptions.timeout specified with no onFailure callback.",
                    );
                  if (
                    typeof J.qos < "u" &&
                    J.qos !== 0 &&
                    J.qos !== 1 &&
                    J.qos !== 2
                  )
                    throw new Error(
                      l(c.INVALID_ARGUMENT, [J.qos, "subscribeOptions.qos"]),
                    );
                  G.subscribe(A, J);
                }),
                (this.unsubscribe = function (A, J) {
                  if (typeof A != "string" && A.constructor !== Array)
                    throw new Error("Invalid argument:" + A);
                  if (
                    ((J = J || {}),
                    u(J, {
                      invocationContext: "object",
                      onSuccess: "function",
                      onFailure: "function",
                      timeout: "number",
                    }),
                    J.timeout && !J.onFailure)
                  )
                    throw new Error(
                      "unsubscribeOptions.timeout specified with no onFailure callback.",
                    );
                  G.unsubscribe(A, J);
                }),
                (this.send = function (A, J, Z, le) {
                  var ee;
                  if (arguments.length === 0)
                    throw new Error("Invalid argument.length");
                  if (arguments.length == 1) {
                    if (!(A instanceof q) && typeof A != "string")
                      throw new Error("Invalid argument:" + typeof A);
                    if (((ee = A), typeof ee.destinationName > "u"))
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [
                          ee.destinationName,
                          "Message.destinationName",
                        ]),
                      );
                    G.send(ee);
                  } else
                    ((ee = new q(J)),
                      (ee.destinationName = A),
                      arguments.length >= 3 && (ee.qos = Z),
                      arguments.length >= 4 && (ee.retained = le),
                      G.send(ee));
                }),
                (this.publish = function (A, J, Z, le) {
                  var ee;
                  if (arguments.length === 0)
                    throw new Error("Invalid argument.length");
                  if (arguments.length == 1) {
                    if (!(A instanceof q) && typeof A != "string")
                      throw new Error("Invalid argument:" + typeof A);
                    if (((ee = A), typeof ee.destinationName > "u"))
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [
                          ee.destinationName,
                          "Message.destinationName",
                        ]),
                      );
                    G.send(ee);
                  } else
                    ((ee = new q(J)),
                      (ee.destinationName = A),
                      arguments.length >= 3 && (ee.qos = Z),
                      arguments.length >= 4 && (ee.retained = le),
                      G.send(ee));
                }),
                (this.disconnect = function () {
                  G.disconnect();
                }),
                (this.getTraceLog = function () {
                  return G.getTraceLog();
                }),
                (this.startTrace = function () {
                  G.startTrace();
                }),
                (this.stopTrace = function () {
                  G.stopTrace();
                }),
                (this.isConnected = function () {
                  return G.connected;
                }));
            },
            q = function (m) {
              var v, b;
              if (!(
                typeof m == "string" ||
                m instanceof ArrayBuffer ||
                (ArrayBuffer.isView(m) && !(m instanceof DataView))
              ))
                throw l(c.INVALID_ARGUMENT, [m, "newPayload"]);
              v = m;
              var E = 0,
                R = !1,
                T = !1;
              Object.defineProperties(this, {
                payloadString: {
                  enumerable: !0,
                  get: function () {
                    return typeof v == "string" ? v : W(v, 0, v.length);
                  },
                },
                payloadBytes: {
                  enumerable: !0,
                  get: function () {
                    if (typeof v == "string") {
                      var L = new ArrayBuffer(N(v)),
                        j = new Uint8Array(L);
                      return (B(v, j, 0), j);
                    }
                    return v;
                  },
                },
                destinationName: {
                  enumerable: !0,
                  get: function () {
                    return b;
                  },
                  set: function (L) {
                    if (typeof L != "string")
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [L, "newDestinationName"]),
                      );
                    b = L;
                  },
                },
                qos: {
                  enumerable: !0,
                  get: function () {
                    return E;
                  },
                  set: function (L) {
                    if (L !== 0 && L !== 1 && L !== 2)
                      throw new Error("Invalid argument:" + L);
                    E = L;
                  },
                },
                retained: {
                  enumerable: !0,
                  get: function () {
                    return R;
                  },
                  set: function (L) {
                    if (typeof L != "boolean")
                      throw new Error(
                        l(c.INVALID_ARGUMENT, [L, "newRetained"]),
                      );
                    R = L;
                  },
                },
                topic: {
                  enumerable: !0,
                  get: function () {
                    return b;
                  },
                  set: function (L) {
                    b = L;
                  },
                },
                duplicate: {
                  enumerable: !0,
                  get: function () {
                    return T;
                  },
                  set: function (L) {
                    T = L;
                  },
                },
              });
            };
          return { Client: O, Message: q };
        })(
          typeof r.g < "u"
            ? r.g
            : typeof self < "u"
              ? self
              : typeof window < "u"
                ? window
                : {},
        );
        return n;
      });
    },
  },
  on = {};
function Qa(e) {
  if (on[e]) return on[e].exports;
  var t = (on[e] = { exports: {} });
  return (dm[e].call(t.exports, t, t.exports, Qa), t.exports);
}
const lo = Qa("mqtt");
window.addEventListener("message", (e) => {
  const { type: t, track: r } = e.data || {};
  try {
    let i = function () {
      console.log("Connected to MQTT broker");
      n.subscribe("/ig_send_message_response", {
        qos: 0,
        onSuccess: () => {
          let p = new lo.Message(JSON.stringify(c));
          p.destinationName = "/ig_send_message";
          try {
            messagePublished = !0;
            n.send(p);
          } catch (error) {
            reportResult(
              !1,
              (error == null ? void 0 : error.message) ||
                "Não foi possível publicar a mensagem no Instagram.",
            );
          }
        },
        onFailure: (result) =>
          reportResult(
            !1,
            (result == null ? void 0 : result.errorMessage) ||
              "Não foi possível assinar a confirmação do Instagram.",
          ),
      });
    };
    if (t === "updateThreadListPM") {
      chrome.storage.local.get("oldest_cursor", ({ oldest_cursor: p }) => {
        var g;
        const l = (
          (g = e == null ? void 0 : e.data) == null ? void 0 : g.cursor
        )
          ? p || "flowsi-refresh-folders"
          : null;
        chrome.runtime.sendMessage(
          { action: "updateThreadList", cursor: l },
          (h) => {
            const y = h != null && h.success ? "true" : "false";
            (h != null &&
              h.error &&
              (console.warn("[Flowsi] Falha ao carregar contatos:", h.error),
              Y.error(h.error)),
              chrome.storage.local.set({
                updateThreadListPMTrack: r + " " + y,
              }));
          },
        );
      });
      return;
    }
    if (t !== "INJECT_DISPATCH_DM_REQUEST_V5") return;
    const dispatchRequestId = String(
      (e == null ? void 0 : e.data == null ? void 0 : e.data.request_id) || "",
    );
    if (dispatchRequestId) {
      const handledDispatches =
        window.__flowsiHandledDispatchDmV5 instanceof Set
          ? window.__flowsiHandledDispatchDmV5
          : (window.__flowsiHandledDispatchDmV5 = new Set());
      if (handledDispatches.has(dispatchRequestId)) return;
      handledDispatches.add(dispatchRequestId);
      window.setTimeout(() => handledDispatches.delete(dispatchRequestId), 12e4);
    }
    console.log("Request received to send direct message");
    var n = new lo.Client(
      "edge-chat.instagram.com",
      443,
      "/chat",
      "mqttwsclient",
    );
    const {
      thread_id: o,
      viewer_id: a,
      text: s,
      request_id: requestId,
      client_context: requestedClientContext,
    } = e.data;
    const mqttSessionId = co(),
      deviceId = uo();
    let u = JSON.stringify({
        u: a,
        s: mqttSessionId,
        cp: 3,
        ecp: 10,
        chat_on: !0,
        fg: !0,
        d: deviceId,
        ct: "cookie_auth",
        mqtt_sid: "",
        aid: 936619743392459,
        st: [],
        pm: [],
        dc: "",
        no_auto_fg: !0,
        asi: { "Accept-Language": "en" },
        a: navigator.userAgent,
      }),
      d = /^\d{10,}$/.test(String(requestedClientContext || ""))
        ? String(requestedClientContext)
        : String(co()),
      c = {
        client_context: d,
        device_id: deviceId,
        action: "send_item",
        item_type: "text",
        mutation_token: d,
        text: s,
        thread_id: o,
      };
    let messagePublished = !1,
      resultReported = !1,
      acknowledgementTimeout = window.setTimeout(
        () => reportResult(!1, "O Instagram não confirmou o envio em tempo hábil."),
        12e3,
      );
    const reportResult = (success, error = "", acknowledgement = null) => {
      if (resultReported) return;
      resultReported = !0;
      window.clearTimeout(acknowledgementTimeout);
      try {
        n.disconnect();
      } catch (_) {}
      if (!requestId) return;
      window.postMessage(
        {
          type: "FLOWSI_DISPATCH_DM_RESULT",
          request_id: requestId,
          success,
          error,
          transport: "instagram-mqtt",
          delivery_attempted: messagePublished,
          acknowledgement,
        },
        "*",
      );
    };
    n.onMessageArrived = (message) => {
      if (
        (message == null ? void 0 : message.destinationName) !==
        "/ig_send_message_response"
      )
        return;
      let acknowledgement = null;
      try {
        acknowledgement = JSON.parse(message.payloadString || "{}");
      } catch (error) {
        reportResult(!1, "O Instagram retornou uma confirmação inválida.");
        return;
      }
      const acknowledgementContext = String(
          (acknowledgement == null ? void 0 : acknowledgement.client_context) ||
            (acknowledgement == null
              ? void 0
              : acknowledgement.payload == null
                ? void 0
                : acknowledgement.payload.client_context) ||
            "",
        ),
        statusCodeValue =
          (acknowledgement == null ? void 0 : acknowledgement.status_code) ??
          (acknowledgement == null
            ? void 0
            : acknowledgement.payload == null
              ? void 0
              : acknowledgement.payload.status_code),
        hasStatusCode =
          statusCodeValue !== void 0 &&
          statusCodeValue !== null &&
          statusCodeValue !== "",
        statusCode = Number(statusCodeValue);
      if (acknowledgementContext && acknowledgementContext !== String(d)) return;
      const accepted =
          (acknowledgement == null ? void 0 : acknowledgement.status) === "ok" ||
          ((acknowledgement == null ? void 0 : acknowledgement.action) ===
            "item_ack" &&
            hasStatusCode &&
            (statusCode === 0 || (statusCode >= 200 && statusCode < 300))),
        rejected =
          (acknowledgement == null ? void 0 : acknowledgement.status) === "fail" ||
          (hasStatusCode &&
            statusCode !== 0 &&
            (statusCode < 200 || statusCode >= 300));
      if (accepted) reportResult(!0, "", acknowledgement);
      else if (rejected)
        reportResult(
          !1,
          (acknowledgement == null ? void 0 : acknowledgement.message) ||
            `O Instagram recusou a mensagem (HTTP ${statusCode || "desconhecido"}).`,
          acknowledgement,
        );
    };
    n.onConnectionLost = (result) => {
      if ((result == null ? void 0 : result.errorCode) !== 0)
        reportResult(!1, (result == null ? void 0 : result.errorMessage) || "Conexão em tempo real encerrada.");
    };
    n.connect({
      mqttVersion: 3,
      useSSL: !0,
      onSuccess: i,
      onFailure: (result) =>
        reportResult(!1, (result == null ? void 0 : result.errorMessage) || "Falha ao conectar ao canal em tempo real."),
      keepAliveInterval: 10,
      userName: u,
    });
  } catch (i) {
    console.log("Inject Error: ", i);
  }
});
function co() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
function uo() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
    const t = (Math.random() * 16) | 0;
    return (e === "x" ? t : (t & 3) | 8).toString(16);
  });
}
async function pm() {
  if (document.getElementById("flowsi-nav-bar")) return;
  await bm();
  const e = document.createElement("div");
  ((e.id = "flowsi-nav-bar"), (e.textContent = "Custom Nav Bar"));
  const t = document == null ? void 0 : document.querySelector("body"),
    r = document == null ? void 0 : document.querySelector('div[id^="mount"]');
  !t ||
    ((t.style.display = "flex"),
    r && (r.style.flex = "1"),
    t == null || t.prepend(e),
    ds(e).render(I(um, { children: [f(rl, {}), f(cm, {})] })));
}
const Xa = document.cookie.split(";").reduce((e, t) => {
    const [r, n] = t.trim().split("=");
    return ((e[r] = n), e);
  }, {}),
  fm = Xa.ds_user_id;
fm &&
  (pm(),
  setTimeout(() => {
    chrome.runtime.sendMessage({ action: "checkNotifications" });
  }, 1e3));
async function gm(e, t) {
  const r = await hm(e),
    n = {
      id: r.id,
      username: r.username,
      profile_img: r.profile_pic_url,
      type: 2,
      timestamp: Date.now(),
    },
    i = await mm(r.id);
  i
    ? window.postMessage(
        {
          type: "INJECT_DISPATCH_DM_REQUEST_V5",
          thread_id: i,
          viewer_id: r.viewer_id,
          user: n,
          text: t,
          debug: !1,
        },
        "*",
      )
    : console.log("Failed to create thread for user:", n);
}
async function mm(e) {
  const t = { recipient_users: `["${e}"]` },
    r = new URLSearchParams([...Object.entries(t)]).toString(),
    n = "https://i.instagram.com/api/v1/direct_v2/create_group_thread/";
  try {
    const o = await (
      await fetch(n, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": Xa.csrftoken,
          "x-requested-with": "XMLHttpRequest",
          "x-instagram-ajax": "1",
          "x-asbd-id": "129477",
          "X-IG-App-ID": "936619743392459",
        },
        body: r,
        credentials: "include",
      })
    ).json();
    return o.status === "ok" && o.thread_id
      ? (console.log(
          "Group thread created successfully. Thread ID:",
          o.thread_id,
        ),
        o.thread_id)
      : (console.log("Failed to create group thread:", o), "");
  } catch (i) {
    return (console.error("Error creating group thread:", i), "");
  }
}
async function vm(e) {
  const t =
      "https://i.instagram.com/api/v1/users/web_profile_info/?username=" + e,
    n = (
      await (
        await fetch(t, {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "content-type": "application/x-www-form-urlencoded",
            "x-ig-app-id": "936619743392459",
            "x-requested-with": "XMLHttpRequest",
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        })
      ).json()
    ).data.user;
  return {
    business_email: n.business_email,
    business_phone_number: n.business_phone_number,
    fbid: n.fbid,
    category: n.category_name || n.business_category_name,
    following: n.edge_follow.count,
    followers: n.edge_followed_by.count,
    posts: n.edge_owner_to_timeline_media.count,
    website: n.external_url,
    verified: n.is_verified,
    messageId: n.eimu_id,
  };
}
async function hm(e) {
  const t =
    "https://i.instagram.com/api/v1/users/web_profile_info/?username=" + e;
  return (
    await (
      await fetch(t, {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
          "content-type": "application/x-www-form-urlencoded",
          "x-ig-app-id": "936619743392459",
          "x-requested-with": "XMLHttpRequest",
        },
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      })
    ).json()
  ).data.user;
}
chrome.runtime.onMessage.addListener(
  (e, t, r) => (
    e.action === "sendMessage" &&
      (gm(e.username, e.message), r({ status: "activated" })),
    !0
  ),
);
async function bm() {
  return new Promise((e) => {
    chrome.storage.local.get(
      "flowsiLan",
      async ({ flowsiLan: t = "pt_BR" }) => {
        if (((window.flowsiLan = t), t === "pt_BR")) {
          ((window.languageMessages = {}), e(!0));
          return;
        }
        try {
          const r = await fetch(
            chrome.runtime.getURL(`/_locales/others/${t}/messages.json`),
          );
          if (r.ok) window.languageMessages = await r.json();
          else throw new Error("Failed to load language file");
        } catch (r) {
          (console.error("Error loading language file:", r),
            (window.flowsiLan = "pt_BR"),
            (window.languageMessages = {}));
        }
        e(!0);
      },
    );
  });
}
const ym = new URL(window.location.href),
  wm = ym.searchParams.get("bulkMode");
function xm() {
  let e = document.getElementById("flowsi-status-overlay");
  return (
    e ||
      ((e = document.createElement("div")),
      (e.id = "flowsi-status-overlay"),
      document.body.appendChild(e)),
    (e.style.position = "fixed"),
    (e.style.top = "0"),
    (e.style.left = "0"),
    (e.style.width = "100%"),
    (e.style.height = "100%"),
    (e.style.backgroundColor = "rgba(0, 0, 0, 0.35)"),
    (e.style.color = "white"),
    (e.style.display = "flex"),
    (e.style.flexDirection = "column"),
    (e.style.justifyContent = "center"),
    (e.style.alignItems = "center"),
    (e.style.zIndex = "10000000000000000001"),
    (e.style.fontFamily = "Arial, sans-serif"),
    (e.style.fontSize = "18px"),
    (e.style.textAlign = "center"),
    (e.style.padding = "20px"),
    {
      updateStatus: (t, r, n, i, o = !0) => {
        const a = (s) =>
          String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        e.innerHTML = `
        <div class="flowsi-status-box">
          <h2 class="flowsi-status-title">${S("bulk_status_title")}</h2>
          <p class="flowsi-status-info">${a(t)}</p>
          <p class="flowsi-status-info">${S("recipient_text")}: <span class="flowsi-highlight">${a(r)}</span></p>
          <p class="flowsi-status-info">${S("bulk_message_remain_text")}: <span class="flowsi-highlight">${a(n)}/<span style='color:green'>${a(i)}</span></span></p>
       <div style="text-align:center; padding-top: 15px">
        ${o ? `<button type="button" class='flowsi-bulk-stop-button' id="flowsi-bulk-stop-20261029">${S("stop_text")}</button>` : ""}

        <p style='color: black; margin-top: 25px; margin-bottom: 0'>*** ${S("bulk_message_suggesion")}</p>
        </div>
          </div>
      `;
        const s = e.querySelector("#flowsi-bulk-stop-20261029");
        s &&
          s.addEventListener("click", () => {
            flowsiBulkCampaignCancelled_20261029 = !0;
            chrome.storage.local.remove(["bulkdata"]);
            e.style.display = "none";
          });
      },
      hide: () => {
        e.style.display = "none";
      },
      show: () => {
        e.style.display = "flex";
      },
    }
  );
}
setTimeout(() => {
  if (!wm) return;
  // Campanhas da versão antiga eram retomadas automaticamente ao abrir uma
  // aba ?bulkMode=true. Não dispare mensagens de uma campanha antiga sem um
  // novo clique explícito do usuário.
  chrome.storage.local.remove(["bulkdata"]);
  try {
    const e = new URL(window.location.href);
    (e.searchParams.delete("bulkMode"), history.replaceState(null, "", e));
  } catch (_) {}
}, 1e3);
let flowsiBulkCampaignRunning_20261029 = !1,
  flowsiBulkCampaignCancelled_20261029 = !1;
const flowsiBulkStorageGet_20261029 = (e) =>
    new Promise((t, r) => {
      chrome.storage.local.get(e, (n) => {
        const i = chrome.runtime.lastError;
        i ? r(new Error(i.message)) : t(n);
      });
    }),
  flowsiBulkStorageSet_20261029 = (e) =>
    new Promise((t, r) => {
      chrome.storage.local.set(e, () => {
        const n = chrome.runtime.lastError;
        n ? r(new Error(n.message)) : t();
      });
    }),
  flowsiBulkStorageRemove_20261029 = (e) =>
    new Promise((t) => chrome.storage.local.remove(e, t)),
  flowsiBulkSendConfirmed_20261029 = (e, t, r) =>
    new Promise((n, i) => {
      chrome.runtime.sendMessage(
        {
          action: "flowsiBulkSendMessage",
          username: String((e == null ? void 0 : e.username) || "")
            .replace(/^@+/, "")
            .trim(),
          message: t,
          threadId: String((e == null ? void 0 : e.threadId) || "").trim(),
          campaignId: String(r || ""),
          recipientKey: String((e == null ? void 0 : e.username) || "")
            .replace(/^@+/, "")
            .trim()
            .toLowerCase(),
        },
        (o) => {
          const a = chrome.runtime.lastError;
          a
            ? i(new Error(a.message))
            : o && o.success
              ? n(o.result || { status: "sent" })
              : i(
                  new Error(
                    (o && o.error) ||
                      "O Instagram não confirmou o envio da mensagem.",
                  ),
                );
        },
      );
    }),
  flowsiBulkCrmMutation_20261029 = (e) =>
    new Promise((t, r) => {
      chrome.runtime.sendMessage(
        { action: "flowsiCrmMutate", ...e },
        (n) => {
          const i = chrome.runtime.lastError;
          i
            ? r(new Error(i.message))
            : n && n.success
              ? t(n)
              : r(
                  new Error(
                    (n && n.error) ||
                      "Não foi possível atualizar a etiqueta do contato.",
                  ),
                );
        },
      );
    }),
  flowsiBulkApplyLabels_20261029 = async (e, t, r) => {
    const n = String((e == null ? void 0 : e.username) || "")
      .replace(/^@+/, "")
      .trim()
      .toLowerCase();
    if (!n) throw new Error("Não foi possível identificar o contato para atualizar a etiqueta.");
    if (t === "sim")
      return flowsiBulkCrmMutation_20261029({
        mutation: "remove",
        username: n,
      });
    const i = String(r || "").trim();
    if (!i) return null;
    const { flowsiBulkDeliveryConfirmedAt: o, ...a } = e || {};
    return flowsiBulkCrmMutation_20261029({
      mutation: "move",
      columnId: i,
      username: n,
      profile: { ...a, username: n, id: a.id || rr() },
    });
  },
  flowsiBulkWait_20261029 = async (e) => {
    const t = Date.now() + Math.max(0, Number(e) || 0);
    for (; Date.now() < t; ) {
      if (flowsiBulkCampaignCancelled_20261029) return !1;
      await an(Math.min(500, t - Date.now()));
    }
    return !flowsiBulkCampaignCancelled_20261029;
  };
async function Im() {
  if (flowsiBulkCampaignRunning_20261029) return;
  flowsiBulkCampaignRunning_20261029 = !0;
  flowsiBulkCampaignCancelled_20261029 = !1;
  const e = xm();
  e.show();
  try {
    let { bulkdata: t } = await flowsiBulkStorageGet_20261029(["bulkdata"]);
    if (!t || !Array.isArray(t.profiles) || !t.profiles.length) {
      await flowsiBulkStorageRemove_20261029(["bulkdata"]);
      e.hide();
      return;
    }
    let r = Math.max(0, Number(t.sentInCurrentBlock) || 0);
    const n = Math.max(1, Number(t.branchSize) || 1),
      i = Math.max(0, Number(t.waitTime) || 0),
      o = Math.max(0, Number(t.branchGap) || 0),
      a = Math.max(t.profiles.length, Number(t.totalProfileCount) || 0),
      flowsiBulkCompletedCount_20261029 = () =>
        Math.min(a, Math.max(0, a - t.profiles.length));
    for (; t.profiles.length && !flowsiBulkCampaignCancelled_20261029; ) {
      const s = t.profiles[0],
        u = String((s == null ? void 0 : s.username) || "")
          .replace(/^@+/, "")
          .trim();
      if (!u) throw new Error("Um contato da campanha não possui @ válido.");
      const d = String(s.name || u).trim(),
        c = flowsiFirstName(d);
      const p = String(t.message || "")
        .replace(/<\s*(?:name|nome)\s*>/gi, () => d)
        .replace(/<\s*primeironome\s*>/gi, () => c)
        .replace(/<\s*username\s*>/gi, () => u);
      if (!p.trim()) throw new Error("A mensagem da campanha está vazia.");
      if (!s.flowsiBulkDeliveryConfirmedAt) {
        e.updateStatus(
          "Enviando mensagem...",
          d,
          flowsiBulkCompletedCount_20261029(),
          a,
        );
        await flowsiBulkSendConfirmed_20261029(s, p, t.campaignId);
        if (flowsiBulkCampaignCancelled_20261029) {
          await flowsiBulkStorageRemove_20261029(["bulkdata"]);
          return;
        }
        s.flowsiBulkDeliveryConfirmedAt = new Date().toISOString();
        await flowsiBulkStorageSet_20261029({ bulkdata: t });
      }
      e.updateStatus(
        "Atualizando etiqueta...",
        d,
        Math.min(a, flowsiBulkCompletedCount_20261029() + 1),
        a,
      );
      await flowsiBulkApplyLabels_20261029(
        s,
        t.removeLabel,
        t.onSuccessLabel,
      );
      t.profiles.shift();
      r += 1;
      t.sentInCurrentBlock = r;
      await flowsiBulkStorageSet_20261029({ bulkdata: t });
      if (!t.profiles.length) break;
      if (r >= n) {
        r = 0;
        t.sentInCurrentBlock = 0;
        await flowsiBulkStorageSet_20261029({ bulkdata: t });
        e.updateStatus(
          "Aguardando o intervalo entre blocos...",
          d,
          flowsiBulkCompletedCount_20261029(),
          a,
        );
        if (!(await flowsiBulkWait_20261029(o * 1e3))) break;
      } else {
        e.updateStatus(
          "Aguardando a próxima mensagem...",
          d,
          flowsiBulkCompletedCount_20261029(),
          a,
        );
        if (!(await flowsiBulkWait_20261029(i * 1e3))) break;
      }
    }
    if (flowsiBulkCampaignCancelled_20261029) return;
    await flowsiBulkStorageRemove_20261029(["bulkdata"]);
    e.updateStatus("Campanha concluída com sucesso.", "—", a, a, !1);
    await an(2e3);
    e.hide();
  } catch (t) {
    console.error("[CRM Flow] Falha no envio em massa:", t);
    e.updateStatus(
      `Campanha pausada: ${(t == null ? void 0 : t.message) || "falha desconhecida"}`,
      "—",
      "—",
      "—",
      !1,
    );
    await an(4e3);
    e.hide();
  } finally {
    flowsiBulkCampaignRunning_20261029 = !1;
  }
}
function an(e) {
  return new Promise((t) => setTimeout(t, e));
}
async function Qt(e) {
  return new Promise((t) => {
    history.pushState(null, "", e);
    const r = new PopStateEvent("popstate", { state: null });
    (dispatchEvent(r),
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.location.pathname === e ? t(!0) : t(!1);
        }, 200);
      }));
  });
}
const Sm = () => !0;
Sm();
Cm().then((e) => {
  e && localStorage.removeItem("sdfasdfzdsad");
});
function Cm() {
  return new Promise((e) => {
    chrome.storage.local.get(["locallslslsChed"], (t) => {
      const r = t.locallslslsChed,
        n = Date.now(),
        i = 1 * 24 * 60 * 60 * 1e3;
      !r || n - r >= i
        ? chrome.storage.local.set({ locallslslsChed: n }, () => {
            e(!0);
          })
        : e(!1);
    });
  });
}
async function Em(e) {
  try {
    const t = await new Promise((n) => {
      _m(e, [], n);
    });
    let r = [];
    return (
      t.forEach((n) => {
        const i = n.thread_id,
          o = n.thread_title;
        if (!n.users[0]) return;
        const a = n.users[0].profile_pic_url,
          s = n.users[0].username,
          u = n.users[0].interop_messaging_user_fbid,
          d = { id: i, name: o, profileImage: a, username: s, messageId: u };
        r.push(d);
      }),
      await new Promise((n) => {
        chrome.storage.local.get(["contactList"], ({ contactList: i = [] }) => {
          let o = [
            ...new Map([...i, ...r].map((a) => [a.username, a])).values(),
          ];
          (e || (o = r), chrome.storage.local.set({ contactList: o }, n));
        });
      }),
      !0
    );
  } catch (t) {
    return (console.log(t), !1);
  }
}
function Dm() {
  const e = document.cookie.split(";"),
    t = {};
  return (
    e.forEach((r) => {
      const [n, i] = r.trim().split("=");
      t[n] = decodeURIComponent(i);
    }),
    t.csrftoken
  );
}
function _m(e, t, r) {
  t = t || [];
  var n =
    "https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&use_unified_inbox=true";
  (e && (n += "&cursor=" + e),
    fetch(n, {
      method: "GET",
      headers: {
        "x-ig-app-id": "936619743392459",
        "x-asbd-id": "129477",
        "x-csrftoken": Dm(),
        "x-requested-with": "XMLHttpRequest",
      },
    })
      .then(function (i) {
        if (i && i.status === 200) return i.json();
        throw new Error("Failed to fetch inbox");
      })
      .then(function (i) {
        var o;
        (i &&
          i.inbox &&
          i.inbox.threads &&
          (i.inbox.threads.forEach(function (a) {
            t.push({
              thread_id: a.thread_id,
              thread_title: a.thread_title,
              users: a.users,
            });
          }),
          chrome.storage.local.set({
            oldest_cursor:
              (o = i == null ? void 0 : i.inbox) == null
                ? void 0
                : o.oldest_cursor,
          })),
          r(t));
      })
      .catch(function () {
        r(t);
      }));
}
