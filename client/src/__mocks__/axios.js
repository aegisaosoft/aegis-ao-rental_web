/**
 * Mock for axios module
 * Jest automatically uses this mock when axios is imported
 */

const mockAxiosInstance = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: {
      use: jest.fn((successFn, errorFn) => {
        mockAxiosInstance._requestInterceptor = { successFn, errorFn };
        return 0;
      }),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn((successFn, errorFn) => {
        mockAxiosInstance._responseInterceptor = { successFn, errorFn };
        return 0;
      }),
      eject: jest.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

const axios = {
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: mockAxiosInstance.interceptors,
  __mockInstance: mockAxiosInstance,
};

module.exports = axios;
module.exports.default = axios;
