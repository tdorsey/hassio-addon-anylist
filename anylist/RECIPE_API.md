# Recipe API Documentation

This document describes the recipe management endpoints added to the AnyList Home Assistant Add-on.

## Recipe Endpoints

### GET /recipes
Retrieve all recipes from your AnyList account.

**Query Parameters:**
- `collection` (optional): Filter recipes by collection name

**Response:**
```json
{
  "recipes": [
    {
      "id": "recipe-identifier",
      "name": "Recipe Name",
      "note": "Recipe notes",
      "sourceName": "Source name",
      "sourceUrl": "http://example.com/recipe",
      "ingredients": [
        {
          "name": "Ingredient name",
          "quantity": "1",
          "unit": "cup"
        }
      ],
      "preparationSteps": ["Step 1", "Step 2"],
      "photoUrls": ["http://example.com/photo.jpg"],
      "cookTime": 30,
      "prepTime": 15,
      "servings": "4",
      "rating": 5,
      "nutritionalInfo": "Nutrition details",
      "creationTimestamp": 1234567890
    }
  ]
}
```

### GET /recipes/{id}
Get details for a specific recipe by ID.

**Parameters:**
- `id`: Recipe identifier

**Response:** Single recipe object (same structure as above)

**Status Codes:**
- 200: Success
- 404: Recipe not found
- 500: Server error

### POST /recipes
Create a new recipe.

**Request Body:**
```json
{
  "name": "New Recipe",
  "note": "Recipe description",
  "sourceName": "Source",
  "sourceUrl": "http://example.com",
  "ingredients": [
    {
      "name": "Ingredient",
      "quantity": "1",
      "unit": "cup"
    }
  ],
  "preparationSteps": ["Step 1", "Step 2"],
  "cookTime": 30,
  "prepTime": 15,
  "servings": "4",
  "rating": 5
}
```

**Response:**
```json
{
  "id": "new-recipe-identifier"
}
```

**Status Codes:**
- 201: Recipe created
- 400: Invalid request data
- 500: Server error

### PUT /recipes/{id}
Update an existing recipe.

**Parameters:**
- `id`: Recipe identifier

**Request Body:** Same as POST (all fields optional for update)

**Response:**
```json
{
  "id": "recipe-identifier"
}
```

**Status Codes:**
- 200: Recipe updated
- 404: Recipe not found
- 400: Invalid request data
- 500: Server error

### DELETE /recipes/{id}
Delete a recipe.

**Parameters:**
- `id`: Recipe identifier

**Status Codes:**
- 200: Recipe deleted
- 404: Recipe not found
- 500: Server error

### GET /recipe-collections
Get available recipe collections.

**Response:**
```json
{
  "collections": []
}
```

*Note: This endpoint returns an empty array in the current implementation. Full collection support can be added in future updates.*

### POST /meal-plan
Add a recipe to the meal planning calendar.

**Request Body:**
```json
{
  "recipeId": "recipe-identifier",
  "date": "2024-01-15",
  "mealType": "Dinner"
}
```

**Response:**
```json
{
  "eventId": "meal-plan-event-identifier"
}
```

**Status Codes:**
- 201: Meal plan event created
- 400: Invalid request data
- 500: Server error

## Authentication and Security

All recipe endpoints use the same authentication and IP filtering as existing endpoints:
- EMAIL and PASSWORD environment variables required
- IP_FILTER environment variable respected if set
- All requests must come from allowed IP addresses

## Error Handling

All endpoints return appropriate HTTP status codes and JSON error messages where applicable:
- 400: Bad Request (missing required fields, invalid data)
- 403: Forbidden (IP filtering)
- 404: Not Found (recipe doesn't exist)
- 500: Internal Server Error (AnyList API errors, network issues)

## Example Usage

```bash
# Get all recipes
curl http://localhost:8080/recipes

# Get specific recipe
curl http://localhost:8080/recipes/recipe-id

# Create new recipe
curl -X POST http://localhost:8080/recipes \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Recipe","ingredients":[{"name":"Test","quantity":"1","unit":"cup"}]}'

# Add recipe to meal plan
curl -X POST http://localhost:8080/meal-plan \
  -H "Content-Type: application/json" \
  -d '{"recipeId":"recipe-id","date":"2024-01-15","mealType":"Dinner"}'
```