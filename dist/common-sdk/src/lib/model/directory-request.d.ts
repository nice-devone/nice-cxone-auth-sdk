import { DirectoryEntities } from '../enum/directory-entities';
import { PollingOptions } from './polling-options';
export interface DirectoryRequest {
    /**
     * @remarks polling options to identify if polling is needed or not
     */
    pollingOptions?: PollingOptions;
    /**
     * @remarks requested entity array for directory data
     */
    entity?: DirectoryEntities[];
    /**
     * @remarks start index for the pagination data, should be greater than 0
     */
    offset?: number;
    /**
     * @remarks end index for the pagination data, should be greater than 0
     */
    limit?: number;
    /**
     * @remarks search string in case for search request, search will happen on fields depending on entity requested.
     * If requested entity is agentList then search will happen based on fields - (firstName, lastName, userName).
     * If requested entity is skillList then search will happen based on field - (skillName).
     * If requested entity is addressBookList then search will happen based on field - (firstName, lastName, mobile, phone, email).
     */
    searchText?: string;
    /**
   * @remarks teamId to filter agent list
   */
    teamId?: string;
    /**
     * @remarks media type such as 9 for digital
     */
    mediaType?: number;
    /**
    * @remarks flag to get all agents including logged-in agent as well.
    */
    shouldFetchAllAgents?: boolean;
}
