# Template APIs (V2 + Meta Sync)

This document defines all backend template APIs under `/api/v1/templates`.

Official reference used for Meta fetch filters and response shape:
- https://developers.facebook.com/docs/graph-api/reference/page/message_templates

## Base

- Base URL: `/api/v1`
- Headers:
  - `Authorization: Bearer <token>`
  - `X-Client-Id: <client-id>`

---

## 1) Create legacy template (backward compatible)

### `POST /templates`

> Deprecated for UI flows. Use `POST /templates/v2` from Template page.

### Request

```json
{
  "name": "order_update",
  "provider_template_id": "123456",
  "type": "TEXT",
  "content": "Hello {{1}}",
  "language_code": "en_US",
  "interaction_type": "CHOICE"
}
```

### Response

`201 Created`

```json
{
  "id": "uuid",
  "name": "order_update",
  "providerTemplateId": "123456",
  "type": "TEXT",
  "content": "Hello {{1}}",
  "languageCode": "en_US",
  "interactionType": "CHOICE",
  "category": "UTILITY",
  "status": "DRAFT",
  "qualityRating": "UNKNOWN",
  "allowCategoryChange": true,
  "componentsJson": "[...]",
  "exampleValuesJson": "{...}",
  "rawTemplateJson": "{...}",
  "lastSyncedAt": "2026-02-23T10:00:00Z",
  "createdBy": "uuid",
  "createdAt": "2026-02-23T10:00:00Z",
  "active": true
}
```

---

## 2) Create V2 template

### `POST /templates/v2`

### Request

```json
{
  "name": "order_delivery_update",
  "category": "UTILITY",
  "language_code": "en_US",
  "components": [
    { "type": "HEADER", "format": "TEXT", "text": "Order update" },
    { "type": "BODY", "text": "Good news {{1}}! Order {{2}} is on the way." },
    { "type": "FOOTER", "text": "Reply STOP to unsubscribe" },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Track Order" },
        { "type": "URL", "text": "Open", "url": "https://example.com/orders/{{1}}" }
      ]
    }
  ]
}
```

### Validation

- Name: lowercase letters, numbers, underscore only (`^[a-z0-9_]+$`)
- Category: `MARKETING | UTILITY | AUTHENTICATION`
- Language code format: `xx_YY` (example `en_US`)
- Exactly one `BODY` component required
- `HEADER`:
  - `TEXT` requires `text` and max 60 chars
  - media/location formats: `IMAGE | VIDEO | DOCUMENT | LOCATION`
- `FOOTER` max 60 chars
- `BUTTONS`:
  - at least 1 and max 10 buttons
  - supported button types: `QUICK_REPLY | URL | PHONE_NUMBER | COPY_CODE | OTP | VOICE_CALL`

### Response

`201 Created` with `TemplateResponse` (same structure as above).

---

## 3) Update template

- `PUT /templates/{id}` (legacy)
- `PUT /templates/v2/{id}` (V2 payload)

Response: `200 OK` with `TemplateResponse`.

---

## 4) Get templates

- `GET /templates` -> list of `TemplateResponse`
- `GET /templates/{id}` -> single `TemplateResponse`
- `DELETE /templates/{id}` -> `204 No Content`

For UI:
- Template page create/preview should use only V2 APIs (`/templates/v2`, `/templates/v2/preview`).

---

## 5) Fetch templates directly from Meta

### `GET /templates/meta`

Forwards supported filter params to Meta:

- `category`
- `content`
- `language`
- `name`
- `name_or_content`
- `status`

### `GET /templates/meta/approved`

Shortcut for `status=APPROVED`.

For UI:
- Quick Send page template dropdown should call this endpoint and display only `name`.
- Campaign page template dropdown should call this endpoint and render preview from `components`.

### Response shape

```json
{
  "data": [
    {
      "id": "12345678910123",
      "name": "order_delivery_update_1",
      "status": "APPROVED",
      "category": "UTILITY",
      "language": "en",
      "qualityScore": "GREEN",
      "rejectionReason": null,
      "specificRejectionReason": null,
      "components": [
        {
          "type": "BODY",
          "text": "Good news {{1}}! Your order #{{2}} is on its way. Thank you!",
          "example": { "body_text": [["Mark", "566701"]] }
        },
        {
          "type": "BUTTONS",
          "buttons": [
            { "type": "POSTBACK", "text": "Track Order", "payload": "track_order" }
          ]
        }
      ],
      "raw": {
        "id": "12345678910123",
        "name": "order_delivery_update_1",
        "components": [],
        "language": "en",
        "status": "APPROVED",
        "category": "UTILITY"
      }
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    }
  }
}
```

`raw` contains the original template node returned by Meta, so newly introduced fields from Meta are preserved without backend changes.

---

## Error model

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Exactly one BODY component is required"
}
```

Common HTTP codes:
- `400` invalid request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` conflict
- `500` provider/internal error
