import { Logger } from "pino";

const pino = jest.fn().mockImplementation(() => ({
  debug: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn(),
} as Partial<Logger>));

module.exports = pino;
