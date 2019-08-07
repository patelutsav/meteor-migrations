export const isFormatedVersion = (version) => { // expected format: 0.0.0_0
  const pattern = /^\d+[\.]\d+[\.]\d+[_]\d+$/;
  return pattern.test(version);
};
