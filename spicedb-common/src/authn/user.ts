/**
 * Defines the properties for a User. Should be a superset of the type defined in playground-ui.
 */
export interface UserProps {
    /**
     * id is the unique ID for the user.
     */
    id: string;

    /**
     * The username of the user.
     */
    username: string;

    /**
     * The user's avatar URL, if any.
     */
    avatarUrl?: string | null;

    /**
     * The full name of the user.
     */
    fullName?: string | null;

    /**
     * The email address for the user, if any.
     */
    emailAddress?: string | null;
}
