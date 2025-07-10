const AnyList = require('anylist');
const { createMockAnyList, handlers } = require('./mocks');

// Mock the AnyList module
jest.mock('anylist');

// Set up environment variables for testing
process.env.EMAIL = 'test@example.com';
process.env.PASSWORD = 'testpassword';
// Disable IP filtering for tests
delete process.env.IP_FILTER;

// Mock console.log to avoid output during tests
console.log = jest.fn();
console.error = jest.fn();

// Configure the mock before each test
beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default successful behavior
    const mockAnyList = createMockAnyList();
    AnyList.mockImplementation(mockAnyList);
    
    // Provide access to handlers for specific test scenarios
    mockAnyList.handlers = handlers;
});

// Global test utilities
global.testUtils = {
    // Helper to simulate different API states
    simulateApiState: (stateName) => {
        const handler = handlers[stateName];
        if (handler) {
            AnyList.mockImplementation(() => handler());
        }
    },
    
    // Helper to get current mock instance
    getMockInstance: () => {
        const mockConstructor = AnyList.mock.results[AnyList.mock.results.length - 1];
        return mockConstructor ? mockConstructor.value : null;
    }
};