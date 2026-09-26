// React's development build records its render timings with performance.measure. Firefox refuses
// a measure whose end falls below zero and throws, which React leaves uncaught, so the page logs
// "Performance.measure: Given attribute end cannot be negative" and may cut its commit short. The
// guard drops that one refusal and passes every other error on. The layout sends it in development
// only; the production build of React makes no measure.
export const MEASURE_GUARD = `(() => {
  const measure = performance.measure.bind(performance);
  performance.measure = (...args) => {
    try {
      return measure(...args);
    } catch (error) {
      if (error instanceof TypeError && /cannot be negative/.test(error.message)) return undefined;
      throw error;
    }
  };
})();`;
