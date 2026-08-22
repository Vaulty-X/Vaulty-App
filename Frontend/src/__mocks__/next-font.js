// Jest stub for next/font — returns a no-op font loader
module.exports = new Proxy(
  {},
  {
    get: () => () => ({ className: '', style: {} }),
  }
);
