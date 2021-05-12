import { ListenerHandler, CommandHandler, AkairoClient, InhibitorHandler } from "discord-akairo";
import { WebhookClient, Message } from "discord.js";
import { connect, connection } from "mongoose";
import { join } from "path";
import util from "./util";
import moment from "moment";

import * as config from "../config";

import { Logger, LogLevel } from "@dimensional-fun/logger";
const logger = new Logger(config.name);

// declare
declare module "discord-akairo" {
	interface AkairoClient {
		inhibitorHandler: InhibitorHandler;
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;

		utils: util;
		config: typeof config;

		log(type: "DEBUG" | "ERROR" | "INFO" | "SILLY" | "TRACE" | "WARN", msg: string): void;
	}
}

// client
export default class Client extends AkairoClient {
	private wb: WebhookClient = new WebhookClient(process.env.WB_ID!, process.env.WB_TOKEN!);
	public utils: util = new util(this);
	public config = config;

	public inhibitorHandler: InhibitorHandler = new InhibitorHandler(this, {
		directory: join(__dirname, "..", "inhibitors"),
		automateCategories: true,
	});
	public listenerHandler: ListenerHandler = new ListenerHandler(this, {
		directory: join(__dirname, "..", "events"),
		automateCategories: true,
	});
	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: join(__dirname, "..", "commands"),
		prefix: process.env.PREFIX,
		allowMention: true,
		automateCategories: true,
		blockBots: true,
		blockClient: true,
		commandUtil: true,
		handleEdits: true,
		commandUtilLifetime: 3e5,
		defaultCooldown: 1e3,
		argumentDefaults: {
			prompt: {
				modifyStart: (_: Message, str: string): string =>
					`${str} \n\nType \`cancel\` to cancel the command!`,
				modifyRetry: (_: Message, str: string): string =>
					`${str} \n\nType \`cancel\` to cancel the command!`,
				timeout: "This took longer then expected, the command is canceled now!",
				ended: "Please take a break, try again later.",
				cancel: "Command is canceled!",
				retries: 3,
				time: 3e4,
			},
			otherwise: "",
		},
		ignorePermissions: this.ownerID,
		ignoreCooldown: this.ownerID,
	});
	public constructor() {
		super({
			ownerID: config.owners,
			disableMentions: "everyone",
		});
	}

	private async _init(): Promise<void> {
		this.commandHandler.useListenerHandler(this.listenerHandler);
		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);

		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			listenerHandler: this.listenerHandler,
			process,
		});

		[this.commandHandler, this.listenerHandler, this.inhibitorHandler].forEach((x) => x.loadAll());
	}

	private connect(): void {
		connect(process.env.DB!, {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
		});

		connection
			.on("connecting", () =>
				this.log(LogLevel.INFO, `Connecting to **${connection.name}** database...`)
			)
			.once("connected", () =>
				this.log(LogLevel.INFO, `Successfully connected to database: **${connection.name}**!`)
			)
			.on("reconnected", () =>
				this.log(LogLevel.INFO, `Successfully re-connected to database: **${connection.name}**!`)
			)
			.on("disconnected", () =>
				this.log(LogLevel.WARN, `Disconnected from **${connection.name}**! Reconnecting...`)
			)
			.on("error", (error: Error) =>
				this.log(
					LogLevel.ERROR,
					`New error - **${connection.name}** - Error: \`${error.stack || error.message}\``
				)
			);
	}

	public async start(): Promise<string> {
		await this._init();
		this.connect();
		return this.login(process.env.TOKEN);
	}

	public log(type: "DEBUG" | "ERROR" | "INFO" | "SILLY" | "TRACE" | "WARN", msg: string): void {
		this.wb.send(
			`\`${moment(Date.now()).format("hh:mm:ss DD-MM-YYYY")}\` **${type}**  ${process.pid}  (**${
				logger.name
			}**): ${msg}`,
			{ split: true }
		);

		// @ts-ignore
		logger[type.toLowerCase()](msg.replace(/`/g, "").replace(/\*/g, ""));
	}
}
