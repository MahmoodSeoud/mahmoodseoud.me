import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { channelAt, mosaic, demosaic, tint } = createRequire(import.meta.url)('../bayer.js');

const flat = (w, h, rgb) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set([...rgb, 255], i * 4);
  return d;
};

test('BayerRG layout: R G on even rows, G B on odd rows', () => {
  assert.deepEqual([channelAt(0, 0), channelAt(1, 0), channelAt(0, 1), channelAt(1, 1)], [0, 1, 1, 2]);
  assert.equal(channelAt(6, 4), 0);
  assert.equal(channelAt(7, 5), 2);
});

test('mosaic keeps exactly one channel per photosite', () => {
  const raw = mosaic(flat(4, 4, [10, 20, 30]), 4, 4);
  assert.deepEqual([...raw.slice(0, 8)], [10, 20, 10, 20, 20, 30, 20, 30]);
});

test('demosaic rebuilds a flat colour exactly, edges included', () => {
  const w = 6, h = 5, rgb = [200, 90, 40];
  const out = demosaic(mosaic(flat(w, h, rgb), w, h), w, h);
  for (let i = 0; i < w * h; i++) assert.deepEqual([...out.slice(i * 4, i * 4 + 4)], [...rgb, 255]);
});

test('demosaic never alters a value the sensor measured', () => {
  const w = 8, h = 8, src = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < src.length; i++) src[i] = (i * 37) % 251;
  const raw = mosaic(src, w, h), out = demosaic(raw, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    assert.equal(out[(y * w + x) * 4 + channelAt(x, y)], raw[y * w + x]);
});

test('demosaic interpolates a missing channel from its neighbours', () => {
  // Green ramps left to right; the red site at (2,2) has green neighbours 30,50 (row) and 40,40 (column).
  const w = 5, h = 5, src = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) src[(y * w + x) * 4 + 1] = x * 10 + 20;
  const out = demosaic(mosaic(src, w, h), w, h);
  assert.equal(out[(2 * w + 2) * 4 + 1], 40);
});

test('tint shows each photosite in its own colour', () => {
  const out = tint(mosaic(flat(2, 2, [100, 100, 100]), 2, 2), 2, 2);
  assert.deepEqual([...out.slice(0, 4)], [100, 14, 14, 255]);
  assert.deepEqual([...out.slice(12, 16)], [14, 14, 100, 255]);
});
