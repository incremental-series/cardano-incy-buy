/**
 * Cardano APIErrorCodes as described in
 * https://developers.cardano.org/docs/governance/cardano-improvement-proposals/cip-0030/#apierror
 */
export var APIErrorCode;
(function (APIErrorCode) {
    /** Inputs do not conform to this spec or are otherwise invalid. */
    APIErrorCode[APIErrorCode["InvalidRequest"] = -1] = "InvalidRequest";
    /** An error occurred during execution of this API call. */
    APIErrorCode[APIErrorCode["InternalError"] = -2] = "InternalError";
    /** The request was refused due to lack of access - e.g. wallet disconnects. */
    APIErrorCode[APIErrorCode["Refused"] = -3] = "Refused";
    /**
     * The account has changed.
     * The dApp should call wallet.enable() to reestablish connection to the new account.
     * The wallet should not ask for confirmation as the user was the one who initiated the account change in the first place.
     */
    APIErrorCode[APIErrorCode["AccountChange"] = -4] = "AccountChange";
})(APIErrorCode || (APIErrorCode = {}));
//# sourceMappingURL=APIError.js.map