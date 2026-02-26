/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const MAX = 10000
  const DELETE_BATCH = 1000

  $app.runInTransaction((txApp) => {
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

}, "notifications")