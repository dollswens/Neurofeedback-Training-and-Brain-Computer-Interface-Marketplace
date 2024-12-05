;; Neurofeedback Training Programs Contract

(define-map training-programs
  { program-id: uint }
  {
    creator: principal,
    title: (string-ascii 64),
    description: (string-utf8 256),
    duration: uint,
    price: uint,
    active: bool
  }
)

(define-map user-programs
  { user: principal, program-id: uint }
  {
    start-time: uint,
    completed: bool
  }
)

(define-data-var last-program-id uint u0)

(define-constant err-not-found (err u404))
(define-constant err-unauthorized (err u401))
(define-constant err-already-purchased (err u409))

(define-public (create-program (title (string-ascii 64)) (description (string-utf8 256)) (duration uint) (price uint))
  (let
    ((new-id (+ (var-get last-program-id) u1)))
    (map-set training-programs
      { program-id: new-id }
      {
        creator: tx-sender,
        title: title,
        description: description,
        duration: duration,
        price: price,
        active: true
      }
    )
    (var-set last-program-id new-id)
    (ok new-id)
  )
)

(define-public (update-program (program-id uint) (title (string-ascii 64)) (description (string-utf8 256)) (duration uint) (price uint) (active bool))
  (let
    ((program (unwrap! (map-get? training-programs { program-id: program-id }) err-not-found)))
    (asserts! (is-eq (get creator program) tx-sender) err-unauthorized)
    (map-set training-programs
      { program-id: program-id }
      (merge program { title: title, description: description, duration: duration, price: price, active: active })
    )
    (ok true)
  )
)

(define-public (purchase-program (program-id uint))
  (let
    ((program (unwrap! (map-get? training-programs { program-id: program-id }) err-not-found)))
    (asserts! (get active program) err-not-found)
    (asserts! (is-none (map-get? user-programs { user: tx-sender, program-id: program-id })) err-already-purchased)
    (try! (stx-transfer? (get price program) tx-sender (get creator program)))
    (map-set user-programs
      { user: tx-sender, program-id: program-id }
      { start-time: block-height, completed: false }
    )
    (ok true)
  )
)

(define-public (complete-program (program-id uint))
  (let
    ((user-program (unwrap! (map-get? user-programs { user: tx-sender, program-id: program-id }) err-not-found)))
    (map-set user-programs
      { user: tx-sender, program-id: program-id }
      (merge user-program { completed: true })
    )
    (ok true)
  )
)

(define-read-only (get-program (program-id uint))
  (map-get? training-programs { program-id: program-id })
)

(define-read-only (get-user-program (user principal) (program-id uint))
  (map-get? user-programs { user: user, program-id: program-id })
)

(define-read-only (get-user-programs (user principal))
  (fold check-and-add-program (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10) (list))
)

(define-private (check-and-add-program (program-id uint) (result (list 10 {program: { creator: principal, title: (string-ascii 64), description: (string-utf8 256), duration: uint, price: uint, active: bool }, user-progress: { start-time: uint, completed: bool }})))
  (match (map-get? user-programs { user: tx-sender, program-id: program-id })
    user-progress (match (map-get? training-programs { program-id: program-id })
      program (unwrap-panic (as-max-len? (append result { program: program, user-progress: user-progress }) u10))
      result
    )
    result
  )
)

