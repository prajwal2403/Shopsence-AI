# ShopSense AI

ShopSense AI is a Chrome extension that analyzes the products on any webpage and provides intelligent recommendations powered by AI.

## Features

- **Product Analysis**: Detects and analyzes products on the current webpage.
- **AI Recommendations**: Uses AI to provide suggestions and insights about the products.
- **Cached Results**: Caches previous analysis results to speed up loading.
- **Responsive UI**: Modern user interface with loading states and error handling.

## Local Development Setup

This project consists of two main parts:
1.  **Backend**: FastAPI server for AI analysis
2.  **Extension**: Chrome extension for user interface

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  (Optional) Create a virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\Activate  # Windows
    # source venv/bin/activate  # macOS/Linux
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Create a `.env` file in the `backend` directory based on `.env.example`:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    GEMINI_MODEL=gemini-2.0-flash
    ALLOWED_ORIGINS=*
    ```

5.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```
    The server will start at `http://localhost:8000`.

### 2. Extension Setup

1.  Navigate to the extension directory:
    ```bash
    cd extension
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`.

4.  Load the extension in Chrome:
    a. Open Chrome and navigate to `chrome://extensions`.
    b. Enable "Developer mode" (toggle in the top-right corner).
    c. Click "Load unpacked".
    d. Select the `extension` directory.

5.  Pin the extension icon to your browser toolbar for easy access.

### 3. Testing

1.  Ensure the backend server is running (`http://localhost:8000`).
2.  Navigate to any e-commerce product page.
3.  Click the ShopSense AI extension icon in your browser toolbar.
4.  Click the "Analyze Page" button.
5.  The extension will display the AI analysis results.

## Local Development Ports

| Component       | Default Port | Notes                                   |
| --------------- | ------------ | --------------------------------------- |
| Backend API     | `8000`       | Run: `uvicorn main:app --reload`        |
| Extension (Vite)| `5173`       | Run: `npm run dev` in `extension/` dir |

## License

ISC