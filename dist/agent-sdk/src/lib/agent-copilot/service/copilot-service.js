import { __awaiter } from "tslib";
import { CXoneAuth, CXoneUser } from '@nice-devone/auth-sdk';
import { MediaType, AgentCopilotContentType } from '@nice-devone/common-sdk';
import { Logger, HttpUtilService, StorageKeys, HttpClient, LocalStorageHelper, dbInstance, IndexDBStoreNames, IndexDBKeyNames, clearIndexDbKey, ValidationUtils } from '@nice-devone/core-sdk';
/**
 * Class for copilot base service
 */
export class CopilotService {
    /**
     * Create instance of CXoneAuth
     * ```
     * @example
     * const copilotService = new CopilotService();
     * ```
     */
    constructor() {
        this.logger = new Logger('agent-sdk', 'CopilotService');
        this.utilService = new HttpUtilService();
        this.validationUtilService = new ValidationUtils();
        this.AGENT_COPILOT_BASE_URI = '/agentcopilotapi/v1/';
        this.AGENT_COPILOT_BASE_URI_V2 = '/agentcopilotapi/v2/';
        this.AGENT_COPILOT_SEARCH = this.AGENT_COPILOT_BASE_URI + 'agent-search';
        this.AGENT_COPILOT_FINAL_SUMMARY = this.AGENT_COPILOT_BASE_URI + 'final-summary';
        this.AGENT_COPILOT_GET_ALL_ADAPTIVE_CARDS_SCHEMAS = this.AGENT_COPILOT_BASE_URI + 'adaptive-card/get-all-adaptive-cards';
        this.AGENT_COPILOT_GET_ADAPTIVE_CARD_SCHEMA = this.AGENT_COPILOT_BASE_URI + 'adaptive-card?cardType={cardType}&mediaType={mediaType}';
        this.AGENT_COPILOT_HEALTH_CHECK = this.AGENT_COPILOT_BASE_URI + 'copilot-health';
        this.AGENT_COPILOT_ENABLEMENT_FOR_CONTACT = this.AGENT_COPILOT_BASE_URI + 'license/copilot-enabled';
        this.AGENT_COPILOT_AGENT_ASSIST_HUB_CONFIG = this.AGENT_COPILOT_BASE_URI_V2 + 'license/retrieve-aah-config';
        this.AGENT_COPILOT_EMAIL_APIS = {
            GET_LAST_GENERATED_TOPICS: this.AGENT_COPILOT_BASE_URI + 'email/topics?contactId={contactId}',
            GET_DRAFT_EMAIL: this.AGENT_COPILOT_BASE_URI + 'email/draft?contactId={contactId}&uniqueEmailId={uniqueEmailId}',
            GENERATE_EMAIL: this.AGENT_COPILOT_BASE_URI + 'email/draft',
        };
        this.aahConfigStore = {};
        /**
         * @returns base url for ACP backend
         * @example getBaseHttpRequest()
         */
        this.getBaseUrlForAcp = () => {
            // TODO update once copilotUrl is confirmed
            const cxOneConfig = this.auth.getCXoneConfig();
            return cxOneConfig.apiFacadeBaseUri;
        };
        /**
         *  @param payload - additional payload
         * @returns basic http request for ACP backend
         * @example getBaseHttpRequest()
         */
        this.getBaseHttpRequest = (payload) => {
            const token = this.auth.getAuthToken();
            const reqInit = {
                headers: this.utilService.initHeader(token.accessToken, 'application/json').headers,
                body: Object.assign(Object.assign({}, this.basePayload()), payload),
            };
            return reqInit;
        };
        /**
         * @returns payload
         * @example commonPayload()
         */
        this.basePayload = () => {
            const userInfo = CXoneUser.instance.getUserInfo();
            const { idToken } = this.auth.getAuthToken();
            const payload = {
                agentId: userInfo === null || userInfo === void 0 ? void 0 : userInfo.icAgentId,
                tenantId: userInfo === null || userInfo === void 0 ? void 0 : userInfo.tenantId,
                contactId: LocalStorageHelper.getItem(StorageKeys.FOCUSED_CONTACT_ID) || '',
                idToken,
            };
            return payload;
        };
        /**
         * Used to get the copilot adaptive card schema by cardType
         * @example -
         * ```
         * copilotService.fetchCopilotAllAdaptiveCardSchemas();
         * ```
         */
        this.fetchCopilotAllAdaptiveCardSchemas = () => {
            return new Promise((resolve, reject) => {
                {
                    const cxaClientVersion = LocalStorageHelper.getItem('agent_settings', true).cxaClientVersion;
                    const reqInit = this.getBaseHttpRequest({
                        cxaClientVersion,
                        version: 'v2', // version is added for the new schema with localization strings
                    });
                    const baseUrl = this.getBaseUrlForAcp();
                    const adaptiveCardUrl = baseUrl + this.AGENT_COPILOT_GET_ALL_ADAPTIVE_CARDS_SCHEMAS;
                    HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(adaptiveCardUrl, reqInit).then((response) => {
                        LocalStorageHelper.setItem(StorageKeys.AGENT_COPILOT_ADAPTIVE_CARD_SCHEMAS, response.data);
                        resolve(response);
                    }, (error) => {
                        this.logger.error('fetchCopilotAllAdaptiveCardSchemas', `${JSON.stringify(error)}`);
                        reject(error);
                    });
                }
            });
        };
        /**
         * Used to get the copilot adaptive card schema by cardType
         * @param cardType - type of adaptive card
         * @param mediaType - type of media channel
         * @example -
         * ```
         * copilotService.fetchCopilotAdaptiveCardSchema("sentimentAndReason", "Voice");
         * ```
         */
        this.fetchCopilotAdaptiveCardSchema = (cardType, mediaType) => {
            return new Promise((resolve, reject) => {
                {
                    const reqInit = this.getBaseHttpRequest({});
                    const baseUrl = this.getBaseUrlForAcp();
                    const adaptiveCardUrl = baseUrl + this.AGENT_COPILOT_GET_ADAPTIVE_CARD_SCHEMA.replace('{cardType}', cardType).replace('{mediaType}', mediaType);
                    HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.get(adaptiveCardUrl, reqInit).then((response) => {
                        let schemaKeyName = `${cardType}`;
                        const existingApativeCardSchemas = LocalStorageHelper.getItem(StorageKeys.AGENT_COPILOT_ADAPTIVE_CARD_SCHEMAS, true);
                        let schemaToAdd = existingApativeCardSchemas ? Object.assign({}, existingApativeCardSchemas) : {};
                        if (mediaType === MediaType.VOICE && [AgentCopilotContentType.KB_COMBO].includes(cardType)) {
                            schemaKeyName += `_${mediaType}`;
                        }
                        schemaToAdd = Object.assign(Object.assign({}, schemaToAdd), { [schemaKeyName]: response.data });
                        LocalStorageHelper.setItem(StorageKeys.AGENT_COPILOT_ADAPTIVE_CARD_SCHEMAS, schemaToAdd);
                        resolve(response);
                    }, (error) => {
                        this.logger.error('fetchCopilotAdaptiveCardSchema', `${JSON.stringify(error)}`);
                        reject(error);
                    });
                }
            });
        };
        /**
         * Used to put copilot data by the agentId into indexdb
         * @example -
         * ```
         * copilotService.setCopilotIndexDb();
         * ```
         */
        this.setCopilotIndexDb = (updatedReduxSlice) => __awaiter(this, void 0, void 0, function* () {
            const db = yield dbInstance();
            db === null || db === void 0 ? void 0 : db.put(IndexDBStoreNames.COPILOT, updatedReduxSlice, IndexDBKeyNames.COPILOT);
        });
        /**
         * Used to get copilot data by the agentId into indexdb
         * @example -
         * ```
         * copilotService.getCopilotIndexDb();
         * ```
         */
        this.getCopilotIndexDb = () => __awaiter(this, void 0, void 0, function* () {
            const db = yield dbInstance();
            const copilotData = yield (db === null || db === void 0 ? void 0 : db.get(IndexDBStoreNames.COPILOT, IndexDBKeyNames.COPILOT));
            return copilotData;
        });
        /**
         * Used to remove caseId record from copilot indexdb data
         * @example -
         * ```
         * copilotService.removeCaseIdFromCopilotIndexDb('1695828916775981777');
         * ```
         */
        this.removeCaseIdFromCopilotIndexDb = (caseId) => __awaiter(this, void 0, void 0, function* () {
            const db = yield dbInstance();
            const copilotData = yield (db === null || db === void 0 ? void 0 : db.get(IndexDBStoreNames.COPILOT, IndexDBKeyNames.COPILOT));
            if (copilotData && copilotData[caseId]) {
                delete copilotData[caseId];
                yield clearIndexDbKey(IndexDBStoreNames.COPILOT, IndexDBKeyNames.COPILOT);
                db === null || db === void 0 ? void 0 : db.put(IndexDBStoreNames.COPILOT, Object.assign({}, copilotData), IndexDBKeyNames.COPILOT);
            }
        });
        /**
         * Used to put copilot redux slice data into indexdb
         * @example -
         * ```
         * copilotService.setCopilotIndexDb(copilotReduxSlice);
         * ```
         */
        this.addAdaptiveCardSchemaToIndexDB = (copilotReduxSlice) => __awaiter(this, void 0, void 0, function* () {
            const db = yield dbInstance();
            db === null || db === void 0 ? void 0 : db.put(IndexDBStoreNames.COPILOT, copilotReduxSlice, IndexDBKeyNames.COPILOT);
        });
        /**
         * Used to get the copilot health
         * @param contactId - contact Id of current active contact
         * @example -
         * ```
         * copilotService.healthCheck('1234');
         * ```
         */
        this.healthCheck = (contactId) => {
            return new Promise((resolve, reject) => {
                var _a;
                const reqInit = this.getBaseHttpRequest({ 'Content-Type': 'application/json' });
                const userInfo = CXoneUser.instance.getUserInfo();
                const busNo = userInfo === null || userInfo === void 0 ? void 0 : userInfo.icBUId;
                reqInit.body = Object.assign(Object.assign({}, reqInit === null || reqInit === void 0 ? void 0 : reqInit.body), { busNo });
                if (contactId !== '') {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    ((_a = reqInit === null || reqInit === void 0 ? void 0 : reqInit.body) === null || _a === void 0 ? void 0 : _a.contactId) === contactId;
                }
                const baseUrl = this.getBaseUrlForAcp();
                const healthCheckUrl = baseUrl + this.AGENT_COPILOT_HEALTH_CHECK;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(healthCheckUrl, reqInit).then((response) => {
                    const resp = response === null || response === void 0 ? void 0 : response.data;
                    resolve(resp);
                }, (error) => {
                    this.logger.error('healthCheck', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        /**
         * Used to get first name of agent logged in
         * @example -
         * ```
         * copilotService.getAgentFirstName();
         * ```
         */
        this.getAgentFirstName = () => {
            return LocalStorageHelper.getItem(StorageKeys.USER_INFO, true)['firstName'] || '';
        };
        /**
         * Used to set AAH config of contactId in localStorage
         * @param contactId - contact Id for which AAH config needs to be stored
         * @param aahConfig - AAH config for contactId
         * @example -
         * ```
         * copilotService.setAgentAssistConfig('123123', {ContactId : '123123',});
         * ```
         */
        this.setAgentAssistConfig = (contactId, aahConfig) => {
            this.aahConfigStore[contactId] = aahConfig;
            LocalStorageHelper.setItem(`${contactId}_agentAssistAppConfig`, aahConfig);
        };
        /**
         * Used to get AAH config for the contactId
         * @param contactId - contact Id
         * @param isObjectFlag - if the value fetched is object or not
         * @example -
         * ```
         * copilotService.getAgentAssistConfig('12321',false);
         * ```
         */
        this.getAgentAssistConfig = (contactId, isObjectFlag = false) => {
            const aahConfig = this.aahConfigStore[contactId];
            if (aahConfig && this.validationUtilService.isValidObject(aahConfig)) {
                return aahConfig;
            }
            return LocalStorageHelper.getItem(`${contactId}_agentAssistAppConfig`, isObjectFlag);
        };
        /**
         * Used to get AAH config for the contactIds from redis cache
         * @param contactIds - list of contact Id
         * @example -
         * ```
         * copilotService.fetchAgentAssistConfigFromCache(['12321']);
         * ```
         */
        this.fetchAgentAssistConfigFromCache = (contactIds) => {
            return new Promise((resolve, reject) => {
                const reqInit = this.getBaseHttpRequest({
                    contactIds,
                });
                const baseUrl = this.getBaseUrlForAcp();
                const apiUrl = baseUrl + this.AGENT_COPILOT_ENABLEMENT_FOR_CONTACT;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(apiUrl, reqInit).then((response) => {
                    const contactIdMap = response === null || response === void 0 ? void 0 : response.data;
                    for (const contactId in contactIdMap) {
                        if (!this.aahConfigStore[contactId] && contactIdMap[contactId]) {
                            const aahConfig = {
                                AppTitle: 'Enlighten Agent Copilot',
                                ContactId: contactId,
                                Params: {
                                    providerId: 'agentCopilot',
                                },
                            };
                            this.setAgentAssistConfig(contactId, aahConfig);
                        }
                    }
                    resolve(contactIdMap);
                }, (error) => {
                    this.logger.error('fetchAgentAssistConfigFromCache', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        /**
         * Used to get AAH config for the contactId
         * @param contactId -  contact Id
         * @example -
         * ```
         * copilotService.retriveAgentAssistConfig('12321');
         * ```
         */
        this.retriveAgentAssistConfig = (contactId) => {
            return new Promise((resolve, reject) => {
                const reqInit = this.getBaseHttpRequest({
                    contactIds: contactId,
                    contactId,
                });
                const baseUrl = this.getBaseUrlForAcp();
                const apiUrl = baseUrl + this.AGENT_COPILOT_AGENT_ASSIST_HUB_CONFIG;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(apiUrl, reqInit).then((response) => {
                    if (response.status === 200 && !this.aahConfigStore[contactId]) {
                        const aahConfig = {
                            AppTitle: 'Enlighten Agent Copilot',
                            ContactId: contactId,
                            Params: Object.assign({ providerId: 'agentCopilot' }, response === null || response === void 0 ? void 0 : response.data),
                        };
                        this.setAgentAssistConfig(contactId, aahConfig);
                    }
                    resolve(response === null || response === void 0 ? void 0 : response.data);
                }, (error) => {
                    this.logger.error('retriveAgentAssistConfig', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        /**
         * Used to store AAH config for the contactId in browser memory by pulling from redis cache, if not already available
         * @param contactId - contact Id
         * @example -
         * ```
         * copilotService.storeAgentAssistConfig('12321');
         * ```
         */
        this.storeAgentAssistConfig = (contactId) => __awaiter(this, void 0, void 0, function* () {
            let aahConfig = this.getAgentAssistConfig(contactId, true);
            if (!aahConfig) {
                aahConfig = yield this.retriveAgentAssistConfig(contactId);
            }
            return aahConfig;
        });
        /**
         * Used to get the last generated list of topics for the contact id
         * @param contactId - contact Id
         * @example -
         * ```
         * copilotService.getLastGeneratedTopics('12321');
         * ```
         */
        this.getLastGeneratedTopics = (contactId) => {
            return new Promise((resolve, reject) => {
                const reqInit = this.getBaseHttpRequest({});
                const baseUrl = this.getBaseUrlForAcp();
                const adaptiveCardUrl = baseUrl + this.AGENT_COPILOT_EMAIL_APIS.GET_LAST_GENERATED_TOPICS.replace('{contactId}', contactId);
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.get(adaptiveCardUrl, reqInit).then((response) => {
                    resolve(response);
                }, (error) => {
                    this.logger.error('getLastGeneratedTopics', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        /**
          * Used to get the draft email by contactId and uniqueEmailId
          * @param contactId - contact Id
          * @param uniqueEmailId - unique email Id
          * @example -
          * ```
          * copilotService.getDraftEmail('12321', 'uniqueEmailId');
          * ```
          */
        this.getDraftEmail = (contactId, uniqueEmailId) => {
            return new Promise((resolve, reject) => {
                const reqInit = this.getBaseHttpRequest({});
                const baseUrl = this.getBaseUrlForAcp();
                const draftEmailUrl = baseUrl + this.AGENT_COPILOT_EMAIL_APIS.GET_DRAFT_EMAIL.replace('{contactId}', contactId).replace('{uniqueEmailId}', uniqueEmailId);
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.get(draftEmailUrl, reqInit).then((response) => {
                    resolve(response.data);
                }, (error) => {
                    this.logger.error('getDraftEmail', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        /**
          * Used to get the draft email by contactId and uniqueEmailId
          * @param contactId - contact Id
          * @param emailIdentifier - unique email Id
          * @param topics - list of topics
          * @example -
          * ```
          * copilotService.generateEmail('12321', 'uniqueEmailId', [{topicId: '123', content: 'topicName'}]);
          * ```
          */
        this.generateEmail = (contactId, emailIdentifier, topics) => {
            return new Promise((resolve, reject) => {
                const reqInit = this.getBaseHttpRequest({
                    contactId,
                    contactNo: contactId,
                    emailIdentifier,
                    topics,
                });
                const baseUrl = this.getBaseUrlForAcp();
                const apiUrl = baseUrl + this.AGENT_COPILOT_EMAIL_APIS.GENERATE_EMAIL;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(apiUrl, reqInit).then((response) => {
                    resolve(response.data);
                }, (error) => {
                    this.logger.error('generateEmail', `${JSON.stringify(error)}`);
                    reject(error);
                });
            });
        };
        this.auth = CXoneAuth.instance;
    }
    /**
     * Used to get the copilot info by search text
     * @param connectionId - connection id to send with the data
     * @example -
     * ```
     * copilotService.generateFinalSummary("some_connectionId");
     * ```
     */
    generateFinalSummary(contactId, status) {
        return new Promise((resolve, reject) => {
            {
                const reqInit = this.getBaseHttpRequest({
                    contactId,
                    isConversationResolved: true,
                    agentUUID: CXoneUser.instance.getUserInfo().userId,
                    status,
                });
                const baseUrl = this.getBaseUrlForAcp();
                const copilotUrl = baseUrl + this.AGENT_COPILOT_FINAL_SUMMARY;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(copilotUrl, reqInit).then((response) => {
                    resolve(response);
                }, (error) => {
                    this.logger.error('generateFinalSummary', `${JSON.stringify(error)}`);
                    reject(error);
                });
            }
        });
    }
    /**
     * Used to get the copilot info by search text
     * @param searchText - Agent search query
     * @param activeContactId - contactId/caseId
     * @example -
     * ```
     * copilotService.search("test",'1234');
     * ```
     */
    search(searchText, activeContactId) {
        return new Promise((resolve, reject) => {
            {
                const contactId = activeContactId;
                const reqInit = this.getBaseHttpRequest({
                    agentAssistQueryConfig: this.getAgentAssistConfig(contactId),
                    query: searchText,
                    contactId,
                    agentUUID: CXoneUser.instance.getUserInfo().userId,
                });
                const baseUrl = this.getBaseUrlForAcp();
                const copilotUrl = baseUrl + this.AGENT_COPILOT_SEARCH;
                HttpClient === null || HttpClient === void 0 ? void 0 : HttpClient.post(copilotUrl, reqInit).then((response) => {
                    const resp = response === null || response === void 0 ? void 0 : response.data;
                    resolve(resp);
                }, (error) => {
                    this.logger.error('agent-search', `${JSON.stringify(error)}`);
                    reject(error);
                });
            }
        });
    }
    /**
     * Used to set essential copilot data
     * @param contactId - contact id to fetch the data from
     * @param elementToAdd - element to add to the local storage
     * @example -
     * ```
     * copilotService.setLsDataByAgentId("123", { sentimentAndReason: [] });
     * ```
     */
    setLsDataByAgentId(contactId, elementToAdd) {
        const agentId = LocalStorageHelper.getItem(StorageKeys.USER_INFO, true)['icAgentId'];
        const key = `${agentId}_ccfCopilotData`;
        const existingCopilotDataInLs = this.getLsDataByAgentId();
        const copilotDataToStore = Object.assign(Object.assign({}, existingCopilotDataInLs), { [contactId]: Object.assign(Object.assign({}, existingCopilotDataInLs[contactId]), elementToAdd) });
        localStorage.setItem(key, JSON.stringify(copilotDataToStore));
    }
    /**
     * Used to get local storage data by the agentId
     * @example -
     * ```
     * copilotService.getLsDataByAgentId();
     * ```
     */
    getLsDataByAgentId() {
        const agentId = LocalStorageHelper.getItem(StorageKeys.USER_INFO, true)['icAgentId'];
        const key = `${agentId}_ccfCopilotData`;
        return JSON.parse(localStorage.getItem(key) || '{}');
    }
}
//# sourceMappingURL=copilot-service.js.map