const AnyList = require("anylist");

async function testRecipeCollections() {
    try {
        console.log("Creating AnyList instance...");
        const any = new AnyList({});
        
        console.log("Calling _getUserData to see structure...");
        // This won't work without credentials, but we can examine the structure
        
        // Let's see if there's a way to access recipe collections
        console.log("AnyList instance properties after construction:");
        Object.getOwnPropertyNames(any).forEach(prop => {
            if (prop.includes('recipe') || prop.includes('collection')) {
                console.log(`- ${prop}: ${any[prop]}`);
            }
        });
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testRecipeCollections();