import sql from "../../lib/crm/sql.js";

let tableReady;

const ensureTable = () => {
  if (!tableReady) {
    tableReady = sql.executeQuery(`
      CREATE TABLE IF NOT EXISTS estimate_documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        document_key VARCHAR(191) NOT NULL,
        payload LONGTEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_estimate_document_key (document_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch((error) => {
      tableReady = undefined;
      throw error;
    });
  }
  return tableReady;
};

const getEstimate = async (documentKey) => {
  await ensureTable();
  const rows = await sql.executeQuery(
    "SELECT payload, created_at, updated_at FROM estimate_documents WHERE document_key = ? LIMIT 1",
    [documentKey]
  );

  if (!rows.length) return null;

  return {
    document: JSON.parse(rows[0].payload),
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
  };
};

const saveEstimate = async (documentKey, document) => {
  await ensureTable();
  const payload = JSON.stringify(document);

  await sql.executeQuery(
    `INSERT INTO estimate_documents (document_key, payload)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [documentKey, payload]
  );

  return getEstimate(documentKey);
};

const listEstimates = async ({ search = "", startDate = "", endDate = "" } = {}) => {
  await ensureTable();
  const keyword = String(search).trim();
  const keywordLike = `%${keyword}%`;
  const query = `
    SELECT document_key, payload, created_at, updated_at
    FROM estimate_documents
    WHERE (? = '' OR document_key LIKE ? OR payload LIKE ?)
      AND (? = '' OR DATE(updated_at) >= ?)
      AND (? = '' OR DATE(updated_at) <= ?)
    ORDER BY updated_at DESC
    LIMIT 500
  `;
  const rows = await sql.executeQuery(query, [keyword, keywordLike, keywordLike, startDate, startDate, endDate, endDate]);

  return rows.flatMap((row) => {
    try {
      const document = JSON.parse(row.payload);
      const supplyTotal = (document.items || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0
      );
      const totalAmount = supplyTotal + (document.taxable ? Math.round(supplyTotal * 0.1) : 0);

      return [{
        documentKey: row.document_key,
        estimateNo: document.estimateNo || "",
        estimateTitle: document.estimateTitle || "스튜디오 렌탈 견적",
        recipientName: document.recipient?.corpName || "",
        issueDate: document.issueDate || "",
        rentalDate: document.rentalDetails?.rentalDate || "",
        totalAmount,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }];
    } catch (error) {
      console.error(`견적서 JSON 파싱 실패 (${row.document_key}):`, error);
      return [];
    }
  });
};

const deleteEstimate = async (documentKey) => {
  await ensureTable();
  const result = await sql.executeQuery("DELETE FROM estimate_documents WHERE document_key = ?", [documentKey]);
  return result.affectedRows > 0;
};

export default {
  getEstimate,
  saveEstimate,
  listEstimates,
  deleteEstimate,
};
