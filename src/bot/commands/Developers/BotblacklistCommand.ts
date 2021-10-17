import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";

import { Message, User } from "discord.js";
import { emojis } from "../../../client/constants";

@ApplyOptions<Command.Options>({
	name: "botblacklist",
	aliases: ["botblacklist"],
	description: "Botblacklists a user/guild",
	usage: "<id>",
	preconditions: ["OwnerOnly"],
})
export default class BotBlacklistCommand extends Command {
	public async MessageRun(message: Message, args: Command.Args) {
		const { value: id } = await args.pickResult("string");
		if (!id) return message.reply(`>>> ${emojis.redcross} | No user/guild id provided.`);
		if (this.client.blacklistManager.blacklisted.includes(id))
			return message.reply(`>>> ${emojis.redcross} | User/guild is already blacklisted.`);

		const data = (await this.client.utils.fetchUser(id)) || (await this.client.guilds.fetch(id));
		if (!data) return message.reply(`>>> ${emojis.redcross} | No user/guild found.`);

		await this.client.blacklistManager.blacklist(data.id);
		await message.reply(
			`>>> ${emojis.redcross} | Successfully blacklisted **${
				data instanceof User ? `${data.tag} (user)` : `${data.name} (guild)`
			}**!`
		);
	}
}
