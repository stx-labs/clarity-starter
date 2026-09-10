(define-constant ERR_COUNT_MUST_BE_POSITIVE (err u1001))
(define-constant ERR_ADD_MORE_THAN_ONE (err u1002))
(define-constant ERR_NOT_ADMIN (err u1003))

(define-data-var count uint u0)
(define-data-var contract-owner principal tx-sender)
(define-data-var cost uint u10)

(define-public (increment)
  (begin
    (try! (stx-transfer? (var-get cost) tx-sender (var-get contract-owner)))
    (ok (var-set count (+ (var-get count) u1)))
  )
)

(define-public (decrement)
  (let ((current-count (var-get count)))
    (asserts! (> current-count u0) ERR_COUNT_MUST_BE_POSITIVE)
    (ok (var-set count (- current-count u1)))
  )
)

(define-public (add (n uint))
  (begin
    (asserts! (> n u1) ERR_ADD_MORE_THAN_ONE)
    (try! (stx-transfer? (* n (var-get cost)) tx-sender (var-get contract-owner)))
    (ok (var-set count (+ (var-get count) n)))
  )
)

(define-read-only (get-count)
  (var-get count)
)

;; ADMIN METHODS

(define-private (is-admin)
  (is-eq contract-caller (var-get contract-owner))
)

(define-public (set-cost (new-cost uint))
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (ok (var-set cost new-cost))
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (ok (var-set contract-owner new-admin))
  )
)
