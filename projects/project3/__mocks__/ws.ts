// Mock WebSocket for testing
const mockWebSocket = jest.fn().mockImplementation((url: string) => {
  const instance = {
    url,
    readyState: 0,
    on: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    emit: jest.fn(),
  }
  return instance
})

export default mockWebSocket