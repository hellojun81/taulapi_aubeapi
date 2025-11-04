//카페24 브랜치 잘확인해야함 카페는  git push --set-upstream origin master
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import sql from "./lib/crm/sql.js";
import estimatesRoutes from "./routes/crm/estimates.js";
import customersRoutes from "./routes/crm/customers.js";
import scheduleRoutes from "./routes/crm/schedules.js";
import setupRoutes from "./routes/crm/setup.js";
// import bankRoutes from "./routes/crm/bank.js";
import smsRoutes from "./routes/crm/smsTemplates.js";
import filmmakersRoutes from "./routes/crm/filmmakers.js";
import autoschedules from "./scheduler/crm/autoschedules.js";
import AdRoutes from "./routes/ad-api/AdRoutes.js";
// import "./scheduler/ad-api/dailyCollector.js";
import popbillRoutes from "./routes/crm/popbill.js";

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 8001;

app.use(
  cors({
    origin: true,
    credentials: true, // 크로스 도메인 허용
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "DELETE"],
  })
);

app.use(express.json());
app.get("/", (req, res) => {
  res.json("welcome aubeCrm ^^");
});

app.use(AdRoutes); // ✅ 여기서 경로 붙이기
app.get("/login", async (req, res) => {
  try {
    console.log("process.env.DB_HOST", process.env.DB_HOST);
    // 쿼리 파라미터에서 id와 pw를 가져옴
    const { id, pw } = req.query;
    // id 또는 pw가 존재하지 않을 경우 처리
    if (!id || !pw) {
      return res.status(400).json({ message: "ID와 비밀번호를 모두 입력해주세요." });
    }
    // SQL 쿼리 실행
    const query = `SELECT id, pw FROM login WHERE id = ? AND pw = ?`;
    const result = await sql.executeQuery(query, [id, pw]);
    console.log("로그인", result);
    // 로그인 성공 여부 확인
    if (result.length > 0) {
      res.json(true); // 로그인 성공 시 'true' 반환
    } else {
      res.status(401).json(false); // 로그인 실패 시 'false' 반환
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error + "서버 오류가 발생했습니다." });
  }
});

app.use("/api/customers", customersRoutes);
app.use("/api/filmmakers", filmmakersRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/estimates", estimatesRoutes);
app.use("/api/popbill", popbillRoutes);

autoschedules.startSchedules();
httpServer.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
