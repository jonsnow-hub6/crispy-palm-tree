/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(async (e) => {
  const MAX = 10000
  const DELETE_BATCH = 1000

  await $app.runInTransaction((txApp) => {
    const total = txApp.findAllRecords("notifications").length

    if (total <= MAX) return

    const oldest = txApp.findRecordsByFilter(
      "notifications",
      "",
      "created",   // oldest first
      DELETE_BATCH,
      0
    )

    for (const r of oldest) {
      txApp.delete(r)
    }
  })

  e.next()

}, "notifications")

onRecordAfterCreateSuccess(async (e) => {
  const MAX = 1000
  const DELETE_BATCH = 100

  await $app.runInTransaction((txApp) => {
    const total = txApp.findAllRecords("rapha").length

    if (total <= MAX) return

    const oldest = txApp.findRecordsByFilter(
      "rapha",
      "",
      "created",   // oldest first
      DELETE_BATCH,
      0
    )

    for (const r of oldest) {
      txApp.delete(r)
    }
  })

  e.next()

}, "rapha")