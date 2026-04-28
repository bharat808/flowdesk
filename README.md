# FlowDesk

FlowDesk Approval Workflow application.

## Description
FlowDesk is an approval workflow application that manages payouts and different account workflows. It integrates with Google Sheets to keep records updated and handles various user roles and approval stages.

## Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Variables:
   Create a `.env` file in the root directory (or use the existing one) with the necessary environment variables:
   - MongoDB connection string
   - Google Service Account credentials
   - Other necessary configuration keys

3. Run the application:
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## Technologies Used
- Node.js
- Express
- MongoDB / Mongoose
- Google Sheets API
- HTML/CSS/JavaScript (Frontend)
