import { sequelize } from "../config/db.js";
import User from "./User.js";
import Conversation from "./Conversation.js";
import Message from "./Message.js";
import AIModel from "./AIModel.js";
import PasswordReset from "./PasswordReset.js";
import TokenUsage from "./TokenUsage.js";
import Folder from "./Folder.js";
import Persona from "./Persona.js";
import SystemSetting from "./SystemSetting.js";
import AuditLog from "./AuditLog.js";
import Announcement from "./Announcement.js";
import Session from "./Session.js";

User.hasMany(Conversation, { foreignKey: "userId", as: "conversations", onDelete: "CASCADE" });
Conversation.belongsTo(User, { foreignKey: "userId", as: "user" });

Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages", onDelete: "CASCADE" });
Message.belongsTo(Conversation, { foreignKey: "conversationId", as: "conversation" });

User.hasMany(PasswordReset, { foreignKey: "userId", as: "passwordResets", onDelete: "CASCADE" });
PasswordReset.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(TokenUsage, { foreignKey: "userId", as: "tokenUsages", onDelete: "CASCADE" });
TokenUsage.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Folder, { foreignKey: "userId", as: "folders", onDelete: "CASCADE" });
Folder.belongsTo(User, { foreignKey: "userId", as: "user" });

Folder.hasMany(Conversation, { foreignKey: "folderId", as: "conversations", onDelete: "SET NULL" });
Conversation.belongsTo(Folder, { foreignKey: "folderId", as: "folder" });

User.hasMany(Persona, { foreignKey: "userId", as: "customPersonas", onDelete: "CASCADE" });
Persona.belongsTo(User, { foreignKey: "userId", as: "user" });

Persona.hasMany(Conversation, { foreignKey: "personaId", as: "conversations", onDelete: "SET NULL" });
Conversation.belongsTo(Persona, { foreignKey: "personaId", as: "persona" });

User.hasMany(AuditLog, { foreignKey: "adminId", as: "auditLogs", onDelete: "SET NULL" });
AuditLog.belongsTo(User, { foreignKey: "adminId", as: "admin" });

User.hasMany(Session, { foreignKey: "userId", as: "sessions", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId", as: "user" });

export { 
  sequelize, 
  User, 
  Conversation, 
  Message, 
  AIModel, 
  PasswordReset, 
  TokenUsage,
  Folder,
  Persona,
  SystemSetting,
  AuditLog,
  Announcement,
  Session
};