# API Documentation

This document provides instructions on how to use the available API endpoints for this project.

---

## Send Message via Telegram

This endpoint allows you to send a message to a specific Telegram chat associated with a generated project.

- **URL**: `/api/send-telegram`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body

The body of the request must be a JSON object containing the following fields:

| Parameter     | Type     | Required | Description                                                                                                                                                           |
|---------------|----------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `message`     | `String` | Yes      | The text content of the message you want to send. HTML parsing is supported by the Telegram API.                                                                      |
| `projectName` | `String` | Yes      | The unique folder name (e.g., `a1b2c`) of the project. The endpoint uses this to look up the correct `chatId` from the central `projects.json` file.                     |
| `chatId`      | `String` | No       | You can optionally provide a direct Telegram Chat ID. If provided, this ID will be used instead of looking up the `projectName`. This is useful for direct testing or alerts. |

### How It Works

When a request is sent to this endpoint, the server performs the following steps:

1.  **Identify the Chat ID**:
    - If a `chatId` is provided directly in the request body, it is used.
    - If only a `projectName` is provided, the server reads the `projects.json` file to find the project with the matching `folderName`. It then retrieves the `chatId` associated with that project.

2.  **Send the Message**:
    - The server constructs a request to the Telegram Bot API using your `TELEGRAM_BOT_TOKEN` from the `.env` file.
    - It sends the `message` content to the identified `chat_id`.

### Example Request

Here is an example of how to send a request using `curl`:

```bash
curl -X POST http://localhost:8080/api/send-telegram \
-H "Content-Type: application/json" \
-d '{
  "projectName": "a1b2c",
  "message": "<b>New Login Attempt!</b>\n\nSomeone just tried to log in to the account."
}'
```

### Responses

#### Success Response

- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "success": true
  }
  ```

#### Error Responses

- **Status Code**: `400 Bad Request`
  - **Reason**: The `message` field was missing, or a `chatId` could not be found for the given `projectName`.
  - **Body**:
    ```json
    {
      "error": "Message is required."
    }
    ```
    or
    ```json
    {
      "error": "Chat ID not found"
    }
    ```

- **Status Code**: `500 Internal Server Error`
  - **Reason**: An issue occurred on the server, such as being unable to connect to the Telegram API or an error reading the `projects.json` file.
  - **Body**:
    ```json
    {
      "error": "Failed to send message"
    }
    ```