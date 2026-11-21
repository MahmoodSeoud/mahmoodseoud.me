/* BayerRG sampling and bilinear demosaic. Pure functions over typed arrays, so
   they run in the page and under `node --test` unchanged. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bayer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

/* BayerRG: even rows R G R G, odd rows G B G B. One channel per photosite. */
function channelAt(x, y) { return (y & 1) ? ((x & 1) ? 2 : 1) : ((x & 1) ? 1 : 0); }

function mosaic(rgba, w, h) {
  var raw = new Uint8ClampedArray(w * h);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = y * w + x;
      raw[i] = rgba[i * 4 + channelAt(x, y)];
    }
  }
  return raw;
}

/* Bilinear demosaic. A measured channel is kept; a missing one is the mean of
   the neighbours in the 3x3 window that did measure it. */
function demosaic(raw, w, h) {
  var out = new Uint8ClampedArray(w * h * 4);
  var sum = [0, 0, 0], cnt = [0, 0, 0];
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      sum[0] = sum[1] = sum[2] = 0; cnt[0] = cnt[1] = cnt[2] = 0;
      for (var dy = -1; dy <= 1; dy++) {
        var yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx; if (xx < 0 || xx >= w) continue;
          var c = channelAt(xx, yy);
          sum[c] += raw[yy * w + xx]; cnt[c]++;
        }
      }
      var own = channelAt(x, y), o = (y * w + x) * 4;
      for (var k = 0; k < 3; k++) out[o + k] = k === own ? raw[y * w + x] : (cnt[k] ? sum[k] / cnt[k] : 0);
      out[o + 3] = 255;
    }
  }
  return out;
}

/* The mosaic as a viewable picture: each photosite shown in its own colour. */
function tint(raw, w, h) {
  var out = new Uint8ClampedArray(w * h * 4);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = y * w + x, v = raw[i], o = i * 4, lift = v * 0.14;
      out[o] = lift; out[o + 1] = lift; out[o + 2] = lift; out[o + 3] = 255;
      out[o + channelAt(x, y)] = v;
    }
  }
  return out;
}

return { channelAt: channelAt, mosaic: mosaic, demosaic: demosaic, tint: tint };
});
