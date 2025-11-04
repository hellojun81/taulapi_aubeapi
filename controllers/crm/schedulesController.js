// controllers/schedulesController.js
import schedulesService from "../../services/crm/schedulesService.js";
import sql from "../../lib/crm/sql.js";
import dayjs from "dayjs";
// 모든 스케줄 가져오기
const getAllSchedules = async (req, res) => {
  try {
    const { csKindIds } = req.query;
    // console.log("getAllSchedules csKindIds", csKindIds);
    const schedules = await schedulesService.getAllSchedules(req, res);
    res.json(schedules);
  } catch (error) {
    // console.error("Error fetching schedules:", error);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
};

// 특정 Month 스케줄 가져오기
const getScheduleById = async (req, res) => {
  try {
    let result;
    const { id } = req.params;
    const { startDate, endDate, customerName, SearchMonth, csKind, sort } = req.query;
    // console.log({ 'req.query': req.query, id: id, SearchMonth: SearchMonth, cskind: csKind })
    switch (id) {
      case "customers":
        const NewId = req.query.id;
        result = await schedulesService.getScheduleByCoustomerId(NewId);
        break;
      case "cs":
        result = await schedulesService.getcsByDate(startDate, endDate, customerName, csKind);
        break;
      case "schedules":
        if (SearchMonth) {
          // console.log("SearchMonth", SearchMonth);
          result = await schedulesService.getScheduleByMonth(SearchMonth, sort);
        } else {
          result = await schedulesService.getScheduleById(SearchMonth);
        }
        break;
      case "getCsKind":
        const query = `SELECT B.id, CONCAT( B.title, '[', CASE WHEN IFNULL(SUM(CASE WHEN A.csKind IN (1, 2, 3, 4, 5) THEN 1 ELSE 0 END), 0) = 0 THEN '0' ELSE SUM(IFNULL(CASE WHEN A.csKind = 1 THEN 1 ELSE 0 END, 0) + IFNULL(CASE WHEN A.csKind = 2 THEN 1 ELSE 0 END, 0) + IFNULL(CASE WHEN A.csKind = 3 THEN 1 ELSE 0 END, 0) + IFNULL(CASE WHEN A.csKind = 4 THEN 1 ELSE 0 END, 0) + IFNULL(CASE WHEN A.csKind = 5 THEN 1 ELSE 0 END, 0)) END, ']' ) AS title, calView FROM csKind B LEFT JOIN schedules A ON A.csKind = B.id AND LEFT(A.start, 7) = '${SearchMonth}' GROUP BY B.id, B.title`;
        result = await sql.executeQuery(query);
        // console.log({ getcsKindResult: result, query: query });
        break;
      default:
        result = await schedulesService.getScheduleById(id);
        break;
    }

    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "Schedule not found" });
    }
  } catch (error) {
    // console.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
};

// 스케줄 생성
const createSchedule = async (req, res) => {
  try {
    let newSchedule = await chgSchedule(req.body);
    // console.log("chgSchedule_", newSchedule);

    if (!newSchedule.calendarId || !newSchedule.NewTitle || !newSchedule.start || !newSchedule.end) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const createdSchedule = await schedulesService.createSchedule(newSchedule);

    if (createdSchedule.includes("이미 등록 되어있습니다")) {
      //   console.log("createdSchedule", createdSchedule);
      res.status(409).json({ message: createdSchedule });
    } else {
      res.status(201).json({ message: createdSchedule });
    }
  } catch (error) {
    // console.error("Error creating schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
};

const chgSchedule = async (Schedule) => {
  let newSchedule = Schedule;
  const { csKind } = newSchedule;
  const { customerName } = newSchedule;
  const getTitle = await GetCsKindTitle(csKind);
  const NewTitle = "[" + getTitle[0].title + "]" + customerName;
  newSchedule.NewTitle = NewTitle;
  // const NewrentPlace = newSchedule.rentPlace.join(', ');
  // newSchedule.rentPlace = NewrentPlace
  newSchedule.start = dayjs(newSchedule.start).format("YYYY-MM-DD");
  newSchedule.end = dayjs(newSchedule.end).format("YYYY-MM-DD");
  return newSchedule;
};

const GetCsKindTitle = async (id) => {
  const query = `SELECT title,calView FROM csKind where id=${id}`;
  return await sql.executeQuery(query);
};

// 스케줄 수정
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSchedule = req.body;
    const { update_ID, SearchMonth } = req.query;
    // console.log({ 스케쥴수정: req.params, id: id, update_ID: update_ID, SearchMonth: SearchMonth, updatedSchedule: updatedSchedule });
    let result;

    if (id === "getCsKind") {
      if (update_ID !== "") {
        result = await schedulesService.updateCsKind(update_ID);
      } else {
        result = await schedulesService.Inint_csKind();
      }
      // console.log("updateSchedule for getScheduleByMonth");
      result = await schedulesService.getScheduleByMonth(SearchMonth);
    } else {
      result = await schedulesService.updateSchedule(id, updatedSchedule);
    }

    if (result) {
      res.json({ message: "수정 완료" });
    } else {
      res.status(404).json({ error: "Schedule not found" });
    }
  } catch (error) {
    // console.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
};

// 스케줄 삭제
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await schedulesService.deleteSchedule(id);
    if (result) {
      res.json({ message: "삭제 완료" });
    } else {
      res.status(404).json({ error: "Schedule not found" });
    }
  } catch (error) {
    // console.error("Error deleting schedule:", error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
};

export default {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
