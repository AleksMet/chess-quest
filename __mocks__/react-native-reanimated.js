'use strict';
const { View, Text, Image, ScrollView, FlatList } = require('react-native');

const useSharedValue = (init) => ({ value: init });
const useAnimatedStyle = (cb) => { try { return cb(); } catch { return {}; } };
const withSpring = (val) => val;
const withTiming = (val) => val;
const withSequence = (...vals) => vals[vals.length - 1] ?? 1;
const withDelay = (_, val) => val;
const withRepeat = (val) => val;
const cancelAnimation = () => {};
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;
const interpolate = (_v, _in, out) => out[0];
const useAnimatedRef = () => ({ current: null });
const useAnimatedScrollHandler = () => {};
const useAnimatedReaction = () => {};
const useAnimatedProps = (cb) => { try { return cb(); } catch { return {}; } };

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent: (comp) => comp,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  cancelAnimation,
  runOnJS,
  runOnUI,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  useAnimatedProps,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    bezier: () => (t) => t,
    in: (fn) => fn,
    out: (fn) => fn,
    inOut: (fn) => fn,
  },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
};
