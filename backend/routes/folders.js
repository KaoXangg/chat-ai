import express from "express";
import { Folder, Conversation } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { sequelize } from "../config/db.js";

const router = express.Router();

router.use(authMiddleware);

// Lấy danh sách thư mục của người dùng kèm số lượng cuộc trò chuyện
router.get("/", async (req, res) => {
  try {
    const folders = await Folder.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "ASC"]],
    });

    // Đếm số lượng cuộc trò chuyện trong mỗi thư mục
    const folderIds = folders.map((f) => f.id);
    const counts = {};
    if (folderIds.length > 0) {
      const convCounts = await Conversation.findAll({
        attributes: [
          "folderId",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          userId: req.user.id,
          folderId: folderIds,
        },
        group: ["folderId"],
        raw: true,
      });

      convCounts.forEach((c) => {
        counts[c.folderId] = parseInt(c.count, 10);
      });
    }

    const data = folders.map((f) => ({
      id: f.id,
      _id: String(f.id),
      name: f.name,
      color: f.color,
      icon: f.icon,
      conversationCount: counts[f.id] || 0,
      createdAt: f.createdAt,
    }));

    res.json({ success: true, data: { folders: data } });
  } catch (err) {
    console.error("[Folders] Lỗi lấy danh sách thư mục:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách thư mục." });
  }
});

// Tạo thư mục mới
router.post("/", async (req, res) => {
  try {
    const { name, color = "#6366f1", icon = "Folder" } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Tên thư mục không được để trống." });
    }

    const folder = await Folder.create({
      userId: req.user.id,
      name: name.trim().slice(0, 100),
      color: typeof color === "string" ? color.slice(0, 30) : "#6366f1",
      icon: typeof icon === "string" ? icon.slice(0, 50) : "Folder",
    });

    res.status(201).json({
      success: true,
      data: {
        folder: {
          id: folder.id,
          _id: String(folder.id),
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          conversationCount: 0,
          createdAt: folder.createdAt,
        },
      },
    });
  } catch (err) {
    console.error("[Folders] Lỗi tạo thư mục:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo thư mục." });
  }
});

// Cập nhật thư mục
router.put("/:id", async (req, res) => {
  try {
    const folder = await Folder.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!folder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thư mục." });
    }

    const { name, color, icon } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Tên thư mục không hợp lệ." });
      }
      folder.name = name.trim().slice(0, 100);
    }
    if (color !== undefined && typeof color === "string") {
      folder.color = color.slice(0, 30);
    }
    if (icon !== undefined && typeof icon === "string") {
      folder.icon = icon.slice(0, 50);
    }

    await folder.save();

    res.json({
      success: true,
      data: {
        folder: {
          id: folder.id,
          _id: String(folder.id),
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
        },
      },
    });
  } catch (err) {
    console.error("[Folders] Lỗi cập nhật thư mục:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật thư mục." });
  }
});

// Xóa thư mục (các cuộc trò chuyện thuộc thư mục này sẽ chuyển về không phân loại)
router.delete("/:id", async (req, res) => {
  try {
    const folder = await Folder.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!folder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thư mục." });
    }

    // Gỡ folderId khỏi các hội thoại liên quan
    await Conversation.update(
      { folderId: null },
      { where: { folderId: folder.id, userId: req.user.id } }
    );

    await folder.destroy();

    res.json({ success: true, message: "Đã xóa thư mục thành công." });
  } catch (err) {
    console.error("[Folders] Lỗi xóa thư mục:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa thư mục." });
  }
});

export default router;
