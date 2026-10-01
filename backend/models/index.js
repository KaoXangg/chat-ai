import { sequelize } from "../config/db.js";
import User from "./User.js";
import Conversation from "./Conversation.js";
import Message from "./Message.js";
import AIModel from "./AIModel.js";
import PasswordReset from "./PasswordReset.js";
import TokenUsage from "./TokenUsage.js";

User.hasMany(Conversation, { foreignKey: "userId", as: "conversations", onDelete: "CASCADE" });
Conversation.belongsTo(User, { foreignKey: "userId", as: "user" });

Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages", onDelete: "CASCADE" });
Message.belongsTo(Conversation, { foreignKey: "conversationId", as: "conversation" });

User.hasMany(PasswordReset, { foreignKey: "userId", as: "passwordResets", onDelete: "CASCADE" });
PasswordReset.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(TokenUsage, { foreignKey: "userId", as: "tokenUsages", onDelete: "CASCADE" });
TokenUsage.belongsTo(User, { foreignKey: "userId", as: "user" });

export { sequelize, User, Conversation, Message, AIModel, PasswordReset, TokenUsage };