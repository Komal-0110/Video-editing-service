# 🎬 Video Editing Platform Backend

A **Node.js** backend service that allows users to:

- Upload videos
- Trim videos
- Overlay subtitles
- Render and download the final edited video

Built using **Express.js**, **Prisma ORM**, **AWS S3**, and **FFmpeg**.

# 🚀 Tech Stack

| Technology                  | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| Node.js + Express           | Server framework                             |
| Prisma + PostgreSQL         | Database ORM and storage                     |
| AWS S3                      | Video file storage                           |
| FFmpeg                      | Video processing (trimming, subtitles, etc.) |
| Multer                      | File uploads                                 |
| BullMQ + Redis _(optional)_ | Background processing (render queue)         |
| Postman                     | API Documentation                            |

# 📂 Project Structure

```
/controllers # Business logic for each endpoint
/routes # API routes
/services # Logic for database and S3 interactions
/prisma # Prisma schema and migrations
/utils # S3 helper functions, FFmpeg helpers
/uploads # (optional) Local storage for testing
app.js # Main app setup
.env # Environment variables
```

# ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Komal-0110/Video-editing-service.git
cd video-editing-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a **.env** file:

```env
DATABASE_URL="postgresql://youruser:yourpassword@localhost:5432/yourdb"
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
S3_BUCKET_NAME=your-s3-bucket-name
```

### 4. Setup Database

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

Generate Prisma client:

```bash
npx prisma generate
```

### 5. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

---

# 🛠 API Endpoints

| Method | Endpoint                    | Description                                 |
| ------ | --------------------------- | ------------------------------------------- |
| POST   | `/api/videos/upload`        | Upload a video file                         |
| POST   | `/api/videos/:id/trim`      | Trim video between start and end timestamps |
| POST   | `/api/videos/:id/subtitles` | Add subtitles to video                      |
| POST   | `/api/videos/:id/render`    | Render final video                          |
| GET    | `/api/videos/:id/download`  | Download the rendered video                 |

---

# ✂️ Example: Trim API Usage

```bash
POST /api/videos/:id/trim

Request Body:
{
"startTime": "00:00:05",
"endTime": "00:00:10"
}
```

---

# 🧠 Key Features

- Video files are stored in **AWS S3** securely
- Prisma handles all DB operations cleanly
- FFmpeg processes videos efficiently
- Designed to be **modular**, **scalable**, and **production-ready**
- Clean Error Handling and Status Codes

# 🛡️ Security & Best Practices

- Secrets stored in `.env` (never commit secrets)
- Files are uploaded securely to S3
- Temporary files are cleaned up after processing
- Try/catch used around async functions
- Validation for all user inputs

# 📹 Demo

A short demo video (with voice explanation) is available here:

👉 [Google Drive Demo Video Link](https://drive.google.com/your-demo-link)