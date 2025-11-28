import type { z } from "zod";
import type { getMentionableUsersInput } from "./validator";

export type GetMentionableUsersInput = z.infer<typeof getMentionableUsersInput>;

export interface MentionableUser {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

export interface GetMentionableUsersOutput {
	users: MentionableUser[];
}
