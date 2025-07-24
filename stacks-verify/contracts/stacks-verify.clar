;; =====================================================
;; STACKs-VERIFY: DECENTRALIZED IDENTITY & REPUTATION ORACLE
;; =====================================================

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_IDENTITY_EXISTS (err u402))
(define-constant ERR_IDENTITY_NOT_FOUND (err u403))
(define-constant ERR_INVALID_CREDENTIAL (err u404))
(define-constant ERR_CREDENTIAL_EXPIRED (err u405))
(define-constant ERR_INSUFFICIENT_REPUTATION (err u406))

;; Data Variables
(define-data-var contract-owner principal CONTRACT_OWNER)
(define-data-var next-identity-id uint u1)
(define-data-var next-credential-id uint u1)
(define-data-var min-reputation-threshold uint u100)

;; Identity Structure
(define-map identities
    { identity-id: uint }
    {
        owner: principal,
        created-at: uint,
        updated-at: uint,
        reputation-score: uint,
        is-verified: bool,
        metadata-hash: (string-ascii 64),
    }
)

;; Principal to Identity ID mapping
(define-map principal-to-identity
    { owner: principal }
    { identity-id: uint }
)
