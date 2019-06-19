const mock: any = jest.genMockFromModule("../index");

// we need to map in the jest-global fetch mock
mock.fetch = global.fetch;

module.exports = mock;
