const AnyList = require("anylist");

async function testCollections() {
    try {
        // Create a mock AnyList instance to see available methods
        const mockAny = new AnyList({});
        
        console.log("AnyList prototype methods:");
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mockAny));
        methods.forEach(method => {
            if (typeof mockAny[method] === 'function') {
                console.log(`- ${method}`);
            }
        });
        
        console.log("\nAnyList properties:");
        Object.getOwnPropertyNames(mockAny).forEach(prop => {
            console.log(`- ${prop}: ${typeof mockAny[prop]}`);
        });
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testCollections();