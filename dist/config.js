"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_ID = exports.CLIENT_ID = exports.TOKEN = exports.BOSSES = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.BOSSES = (process.env.BOSSES || "Kazzak,Doomwalker").split(",");
exports.TOKEN = process.env.DISCORD_TOKEN;
exports.CLIENT_ID = process.env.DISCORD_CLIENT_ID;
exports.GUILD_ID = process.env.DISCORD_GUILD_ID;
