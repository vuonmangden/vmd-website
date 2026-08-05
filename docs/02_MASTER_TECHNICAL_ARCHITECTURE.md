# MASTER TECHNICAL ARCHITECTURE  
## NỀN TẢNG VƯỜN MĂNG ĐEN – HOMESTAY & BBQ

**Tên tài liệu:** Master Technical Architecture  
**Tên hệ thống:** Vườn Măng Đen – Homestay & BBQ  
**Phiên bản:** 1.0  
**Phạm vi:** Toàn bộ 04 Phase  
**Tài liệu đầu vào:**  
- `VMD_PRD_PHASE_01_MVP_BOOKING.md`
- `VMD_PRD_PHASE_02_CONTENT_CRM_MAP.md`
- `VMD_PRD_PHASE_03_AI_TRIP_MEMBERSHIP.md`
- `VMD_PRD_PHASE_04_MARKETPLACE_ECOSYSTEM.md`

**Mục đích:** Xác định kiến trúc kỹ thuật tổng thể, ranh giới module, nguyên tắc dữ liệu, tích hợp, bảo mật, vận hành và lộ trình mở rộng để từng Phase có thể được triển khai độc lập nhưng không phải xây dựng lại nền tảng ở các Phase sau.

---

# 1. Tóm tắt kiến trúc

Nền tảng Vườn Măng Đen được đề xuất xây dựng theo mô hình:

> **Modular Monolith trong giai đoạn đầu, API-first, event-driven cho tác vụ nền và sẵn sàng tách dịch vụ khi quy mô tăng.**

Kiến trúc phải hỗ trợ đồng thời bốn nhóm năng lực:

1. **Commerce Core**
   - Đặt phòng.
   - Đặt bàn BBQ.
   - Thanh toán.
   - Voucher.
   - Đơn hàng.
   - Marketplace.
   - Đối soát.

2. **Destination Content Platform**
   - Blog.
   - Cẩm nang.
   - Địa điểm.
   - Bản đồ.
   - Nội dung theo mùa.
   - Kho dữ liệu phục vụ AI.

3. **Customer & Membership Platform**
   - CRM.
   - Tài khoản thành viên.
   - Sở thích.
   - Hành vi.
   - Marketing automation.
   - Loyalty.
   - Review và cộng đồng.

4. **AI Travel Platform**
   - AI Trip Planner.
   - AI Concierge.
   - Retrieval-Augmented Generation.
   - Rule Engine.
   - Routing Engine.
   - AI observability và quality control.

Kiến trúc tổng thể phải ưu tiên:

- Mobile-first.
- Không khóa vào một nhà cung cấp.
- Dữ liệu tập trung.
- Có nhật ký giao dịch.
- Khả năng kiểm soát chất lượng.
- Khả năng mở rộng đa điểm đến.
- Có thể triển khai từng Phase mà không cần microservices quá sớm.

---

# 2. Mục tiêu kiến trúc

## 2.1 Mục tiêu chính

- Hỗ trợ đầy đủ phạm vi của 04 PRD.
- Cho phép Phase 1 ra mắt nhanh.
- Không tạo nợ kỹ thuật khiến Phase 2–4 phải xây lại.
- Đảm bảo booking không trùng phòng hoặc trùng tài nguyên.
- Đảm bảo giao dịch thanh toán được xử lý idempotent.
- Hỗ trợ CRM và timeline khách hàng thống nhất.
- Hỗ trợ dữ liệu địa điểm có cấu trúc.
- Hỗ trợ AI sử dụng dữ liệu đã xác minh.
- Hỗ trợ Marketplace đa đối tác.
- Hỗ trợ đối soát và phân bổ giao dịch.
- Hỗ trợ audit, bảo mật và sao lưu.

## 2.2 Mục tiêu phi chức năng

- Hiệu năng tốt trên thiết bị di động.
- Có khả năng mở rộng theo chiều ngang.
- Có khả năng phục hồi khi một tích hợp bên ngoài gặp lỗi.
- Có thể theo dõi lỗi và truy vết giao dịch.
- Có thể thay thế nhà cung cấp email, bản đồ, AI hoặc thanh toán.
- Hỗ trợ phát triển theo monorepo.
- Hỗ trợ CI/CD và nhiều môi trường.
- Hỗ trợ kiểm thử tự động.

---

# 3. Những nguyên tắc kiến trúc bắt buộc

## 3.1 Modular Monolith trước, Microservices sau

Không triển khai microservices ngay từ Phase 1.

Lý do:

- Quy mô đội ngũ ban đầu có thể nhỏ.
- Nghiệp vụ còn tiếp tục thay đổi.
- Microservices làm tăng chi phí triển khai, giám sát, bảo mật và xử lý giao dịch phân tán.
- Phần lớn nghiệp vụ cần giao dịch dữ liệu nhất quán.

Tuy nhiên hệ thống phải được tổ chức thành các module độc lập, có ranh giới rõ ràng để sau này có thể tách thành dịch vụ riêng.

## 3.2 API-first

Mọi chức năng nghiệp vụ phải được triển khai qua API hoặc service layer rõ ràng.

Frontend không được truy cập trực tiếp database để thực hiện nghiệp vụ quan trọng như:

- Giữ phòng.
- Tạo booking.
- Xác nhận thanh toán.
- Tính hoa hồng.
- Hoàn tiền.
- Đối soát.
- Xử lý voucher.
- Tạo lịch trình AI.

## 3.3 Event-driven cho tác vụ nền

Các tác vụ không cần phản hồi tức thời phải thực hiện qua event và queue:

- Gửi email.
- Gửi Zalo.
- Nhắc lịch.
- Đồng bộ CRM.
- Tạo báo cáo.
- Xử lý ảnh.
- Re-index nội dung.
- Tạo embedding.
- Đối soát.
- Gửi thông báo đối tác.
- Tính lại điểm chất lượng.

## 3.4 Database là nguồn dữ liệu chuẩn

- PostgreSQL là nguồn dữ liệu giao dịch chính.
- Redis chỉ dùng cho cache, lock, queue và dữ liệu tạm.
- Search index chỉ là bản sao phục vụ tìm kiếm.
- Vector database chỉ phục vụ retrieval, không thay thế dữ liệu gốc.
- Dữ liệu AI phải luôn truy ngược được về nguồn.

## 3.5 Mọi giao dịch tài chính phải audit được

Mọi thay đổi liên quan đến:

- Thanh toán.
- Hoàn tiền.
- Voucher.
- Hoa hồng.
- Đối soát.
- Công nợ.
- Thay đổi giá.
- Thay đổi tài khoản ngân hàng.

phải có:

- Người thực hiện.
- Thời gian.
- Giá trị trước.
- Giá trị sau.
- Lý do.
- Nguồn thao tác.
- Correlation ID.

## 3.6 Không để AI tự thực hiện giao dịch

AI có thể:

- Gợi ý.
- Giải thích.
- Tìm kiếm.
- Chuẩn bị dữ liệu.
- Đề xuất thao tác.

AI không được tự:

- Đặt đơn.
- Hủy đơn.
- Thanh toán.
- Hoàn tiền.
- Thay đổi booking.
- Thay đổi giá.
- Chỉnh hoa hồng.

Mọi thao tác giao dịch phải do người dùng hoặc nhân sự xác nhận.

---

# 4. Kiến trúc logic tổng thể

```text
Người dùng / Đối tác / Nhân viên
            │
            ▼
     Web Apps / Admin Apps
            │
            ▼
       API Gateway / BFF
            │
            ▼
┌─────────────────────────────────────────────┐
│            Modular Application Core         │
│                                             │
│ Booking │ BBQ │ Payments │ Orders │ CRM     │
│ CMS │ Places │ Map │ Membership │ Reviews   │
│ Marketing │ Marketplace │ Settlement        │
│ AI Planner │ AI Concierge │ Notifications   │
└─────────────────────────────────────────────┘
            │
            ├── PostgreSQL
            ├── Redis / Queue
            ├── Object Storage
            ├── Search Index
            ├── Vector Index
            └── Analytics Warehouse
            │
            ▼
  External Integrations / Provider Adapters
```

---

# 5. Kiến trúc triển khai đề xuất

## 5.1 Ứng dụng người dùng

### Web Public

Phục vụ:

- Homepage.
- Booking.
- Blog.
- Bản đồ.
- Trip Planner.
- AI Concierge.
- Marketplace.
- Tài khoản thành viên.

Đề xuất:

- Next.js.
- TypeScript.
- Server-side rendering cho SEO.
- Static generation cho nội dung ít thay đổi.
- Progressive enhancement.
- PWA cho lịch trình và chế độ mạng yếu.

## 5.2 Ứng dụng quản trị nội bộ

Phục vụ:

- Lễ tân.
- Quản lý.
- Marketing.
- CRM.
- Kế toán.
- AI Admin.
- Marketplace Admin.
- Moderator.

Đề xuất:

- Next.js hoặc React Admin App riêng.
- Dùng chung design system.
- Phân quyền theo vai trò.
- Tách domain quản trị khỏi website công khai.

## 5.3 Cổng quản trị đối tác

Phục vụ:

- Đăng ký đối tác.
- Quản lý sản phẩm.
- Quản lý lịch.
- Quản lý đơn.
- Đối soát.
- Báo cáo.

Đề xuất:

- Web app riêng.
- Dùng chung API core.
- Dữ liệu cách ly theo `partner_id`.
- Có MFA cho thao tác tài chính.

## 5.4 Backend

Đề xuất:

- NestJS.
- TypeScript.
- Modular monolith.
- REST API là giao diện chính.
- WebSocket hoặc Server-Sent Events cho cập nhật thời gian thực khi cần.
- OpenAPI để sinh tài liệu và client.

## 5.5 Database

Đề xuất:

- PostgreSQL.
- Có thể dùng Supabase Managed PostgreSQL trong giai đoạn đầu.
- Mọi nghiệp vụ quan trọng xử lý ở backend.
- Không phụ thuộc duy nhất vào RLS để bảo vệ dữ liệu.
- RLS có thể dùng như lớp bảo vệ bổ sung.

## 5.6 Redis

Dùng cho:

- Cache.
- Distributed lock.
- Queue.
- Rate limiting.
- Session hoặc token tạm.
- Booking hold.
- Idempotency key.
- AI response cache.

## 5.7 Queue

Đề xuất:

- BullMQ hoặc giải pháp tương đương trên Redis.
- Tách worker khỏi API khi lưu lượng tăng.

## 5.8 Object Storage

Dùng cho:

- Ảnh phòng.
- Ảnh địa điểm.
- Ảnh đánh giá.
- Album khách.
- Chứng từ đối tác.
- Bằng chứng khiếu nại.
- Tệp xuất báo cáo.

Đề xuất:

- S3-compatible storage.
- URL ký tạm thời.
- Không public trực tiếp dữ liệu nhạy cảm.

---

# 6. Stack công nghệ khuyến nghị

| Lớp | Công nghệ đề xuất |
|---|---|
| Frontend public | Next.js + TypeScript |
| Admin | Next.js/React + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| Auth | Supabase Auth hoặc hệ thống OAuth-compatible |
| Cache/Queue | Redis + BullMQ |
| Object storage | S3-compatible |
| Search ban đầu | PostgreSQL Full Text Search |
| Search mở rộng | Meilisearch/OpenSearch |
| Vector search | pgvector |
| AI orchestration | Provider abstraction + RAG service |
| Map | Provider adapter cho Google Maps/Mapbox |
| Email | Provider adapter |
| Zalo | Zalo OA/ZNS adapter |
| SMS | Provider adapter tùy chọn |
| Payment | SePay adapter + gateway adapter |
| Monitoring | OpenTelemetry + Sentry + metrics dashboard |
| CI/CD | GitHub Actions |
| Frontend hosting | Vercel hoặc nền tảng tương đương |
| Backend hosting | Container platform |
| Analytics | Event pipeline + BI dashboard |
| Monorepo | Turborepo hoặc Nx |

Không khóa cứng phiên bản trong Master Architecture. Phiên bản cụ thể được chốt trong Tech Spec từng Phase.

---

# 7. Cấu trúc monorepo đề xuất

```text
/apps
  /web
  /admin
  /partner
  /api
  /worker

/packages
  /ui
  /config
  /types
  /validation
  /auth
  /logging
  /api-client
  /domain-events
  /database
  /testing
  /ai-sdk
  /map-sdk
  /notification-sdk
  /payment-sdk

/modules
  /identity
  /customer
  /booking
  /bbq
  /inventory
  /payment
  /notification
  /content
  /place
  /map
  /crm
  /marketing
  /voucher
  /review
  /membership
  /trip-planner
  /ai-concierge
  /partner
  /catalog
  /cart
  /order
  /commission
  /settlement
  /dispute
  /reporting

/infrastructure
  /docker
  /terraform
  /monitoring
  /scripts

/docs
  /prd
  /architecture
  /techspec
  /adr
  /api
```

---

# 8. Ranh giới domain

## 8.1 Identity & Access

Phụ trách:

- Tài khoản.
- Đăng nhập.
- Xác minh.
- Vai trò.
- Quyền.
- Thiết bị.
- MFA.
- Session.
- Partner access.

Không phụ trách:

- Hồ sơ CRM.
- Sở thích khách hàng.
- Booking.

## 8.2 Customer & CRM

Phụ trách:

- Hồ sơ khách hàng.
- Timeline.
- Phân nhóm.
- Đồng ý marketing.
- Hợp nhất hồ sơ.
- Sở thích.
- Lịch sử tương tác.

## 8.3 Booking

Phụ trách:

- Loại phòng.
- Phòng thực tế.
- Availability.
- Hold.
- Booking.
- Check-in.
- Check-out.
- Hủy.
- Đổi lịch.

## 8.4 BBQ Reservation

Phụ trách:

- Khu vực.
- Bàn.
- Khung giờ.
- Sức chứa.
- Đặt cọc.
- Trạng thái phục vụ.

## 8.5 Payment

Phụ trách:

- Payment intent.
- Transaction.
- Webhook.
- Reconciliation.
- Refund.
- Idempotency.
- Provider adapter.

## 8.6 Notification

Phụ trách:

- Template.
- Email.
- Zalo.
- SMS.
- Web push.
- Delivery log.
- Retry.
- Preference.

## 8.7 Content & CMS

Phụ trách:

- Blog.
- Cẩm nang.
- FAQ.
- Landing page.
- Media.
- Versioning.
- Approval workflow.
- SEO metadata.

## 8.8 Places & Destination Data

Phụ trách:

- Địa điểm.
- Danh mục.
- Tọa độ.
- Thuộc tính.
- Quan hệ địa điểm.
- Mùa.
- Thời điểm.
- Độ tin cậy.
- Ngày cập nhật.

## 8.9 Marketing

Phụ trách:

- Campaign.
- Automation.
- Segment.
- Voucher.
- Attribution.
- UTM.
- Consent.

## 8.10 Membership

Phụ trách:

- Tài khoản thành viên.
- Hạng.
- Quyền lợi.
- Lịch sử quyền lợi.
- Referral.
- Notification setting.

## 8.11 Trip Planner

Phụ trách:

- Trip.
- Group.
- Preference.
- Constraint.
- Itinerary.
- Version.
- Activity.
- Conflict.
- Travel mode.
- Optimization.

## 8.12 AI Concierge

Phụ trách:

- Conversation.
- Message.
- Retrieval.
- Tool calling.
- Safety rule.
- Handover.
- Evaluation.
- Prompt version.

## 8.13 Marketplace

Phụ trách:

- Partner.
- Shop.
- Catalog.
- Product.
- Service.
- Inventory.
- Availability.
- Cart.
- Order.
- Order item.

## 8.14 Commission & Settlement

Phụ trách:

- Commission rule.
- Fee.
- Allocation.
- Settlement period.
- Settlement statement.
- Partner payable.
- Dispute.

---

# 9. Chiến lược database

## 9.1 Một database giao dịch chính

Giai đoạn Phase 1–3 dùng một PostgreSQL cluster.

Ưu điểm:

- Giao dịch nhất quán.
- Dễ backup.
- Dễ truy vấn.
- Ít chi phí vận hành.

Các module được phân tách bằng:

- Schema.
- Table naming.
- Repository layer.
- Service boundary.
- Permission.

## 9.2 Tách database khi nào

Chỉ xem xét tách khi:

- Marketplace có khối lượng giao dịch lớn.
- AI logs tăng quá nhanh.
- Analytics ảnh hưởng database giao dịch.
- Search workload quá nặng.
- Đội ngũ đủ năng lực vận hành.

## 9.3 Database schema đề xuất

```text
identity
customer
booking
bbq
payment
notification
content
place
marketing
membership
trip
ai
partner
catalog
commerce
settlement
support
audit
analytics
```

---

# 10. Mô hình định danh chính

Mọi thực thể phải dùng UUID hoặc định danh không tuần tự.

Các khóa chính quan trọng:

- `user_id`
- `customer_id`
- `member_id`
- `booking_id`
- `reservation_id`
- `payment_id`
- `transaction_id`
- `place_id`
- `trip_id`
- `itinerary_id`
- `partner_id`
- `product_id`
- `order_id`
- `settlement_id`

Không dùng số điện thoại hoặc email làm khóa chính.

---

# 11. Customer Identity Resolution

Một người có thể xuất hiện qua:

- Booking.
- Form liên hệ.
- Email.
- Zalo.
- Tài khoản thành viên.
- Đơn Marketplace.
- Review.
- Referral.

Cần có:

- `customer_profile`.
- `customer_identity`.
- `identity_type`.
- `identity_value_hash`.
- `verification_status`.
- `confidence_score`.
- `linked_user_id`.

Quy tắc:

- Không tự hợp nhất chỉ dựa trên họ tên.
- Số điện thoại và email cần xác minh.
- Hợp nhất thủ công phải có audit.
- Có khả năng tách lại khi hợp nhất sai.

---

# 12. Kiến trúc booking và availability

## 12.1 Nguồn lực

Mọi tài nguyên có thể đặt phải được chuẩn hóa:

- Phòng.
- Bàn.
- Xe.
- Hướng dẫn viên.
- Photographer.
- Tour seat.
- Dịch vụ theo giờ.

Dùng khái niệm chung:

- Resource.
- Resource type.
- Availability rule.
- Capacity.
- Reservation.

## 12.2 Chống trùng lịch

Sử dụng:

- Database transaction.
- Row-level lock hoặc advisory lock.
- Unique/exclusion constraint khi phù hợp.
- Redis lock chỉ là lớp hỗ trợ, không thay thế database constraint.

## 12.3 Booking hold

Quy trình:

```text
Create Hold
→ Lock Resource
→ Create Payment Intent
→ Wait Payment
→ Confirm
hoặc
→ Expire Hold
→ Release Resource
```

## 12.4 Trạng thái hold

- Active.
- Confirmed.
- Expired.
- Cancelled.
- Converted.

## 12.5 Idempotency

Tạo booking phải nhận `Idempotency-Key`.

Nếu client gửi lại:

- Trả kết quả cũ.
- Không tạo booking mới.

---

# 13. Kiến trúc thanh toán

## 13.1 Payment Intent

Mỗi giao dịch bắt đầu bằng `payment_intent`.

Thuộc tính:

- Số tiền.
- Tiền tệ.
- Booking/order.
- Provider.
- Expiry.
- Status.
- Idempotency key.
- Customer.
- Metadata.

## 13.2 Webhook Processing

Luồng:

```text
Provider Webhook
→ Verify Signature
→ Store Raw Payload
→ Check Event ID
→ Idempotency Check
→ Match Transaction
→ Update Payment
→ Publish Event
→ Trigger Notifications
```

## 13.3 Sổ cái tài chính

Từ Phase 4 cần ledger nội bộ:

- Debit.
- Credit.
- Account.
- Reference.
- Currency.
- Transaction group.
- Immutable entry.

Không chỉnh sửa entry đã ghi.

Nếu sai:

- Tạo reversal entry.
- Tạo adjustment entry.

## 13.4 Hoàn tiền

Refund phải có:

- Yêu cầu.
- Lý do.
- Người duyệt.
- Số tiền.
- Phương thức.
- Provider reference.
- Trạng thái.
- Ảnh hưởng settlement.

---

# 14. Kiến trúc notification và scheduler

## 14.1 Scheduler

Dùng job scheduler cho:

- T-7.
- T-3.
- T-1.
- Sau check-out.
- Sinh nhật.
- Voucher.
- Settlement.
- Data freshness check.

## 14.2 Notification Orchestrator

Nhận yêu cầu chung:

```json
{
  "recipient": "...",
  "template": "...",
  "channel_priority": ["zalo", "email"],
  "payload": {},
  "scheduled_at": "...",
  "deduplication_key": "..."
}
```

## 14.3 Retry

- Retry theo exponential backoff.
- Dead-letter queue.
- Không gửi trùng.
- Có dashboard gửi lỗi.

## 14.4 Preference

Phân biệt:

- Transactional notification.
- Marketing notification.
- Operational alert.

Người dùng không thể tắt thông báo giao dịch bắt buộc.

---

# 15. Kiến trúc CMS và nội dung

## 15.1 Structured Content

Không chỉ lưu HTML tự do.

Mỗi loại nội dung có schema riêng:

- Article.
- Guide.
- Place.
- FAQ.
- Checklist.
- Collection.
- Seasonal content.
- Email template.

## 15.2 Versioning

- Draft.
- Review.
- Approved.
- Scheduled.
- Published.
- Archived.

Lưu:

- Version.
- Author.
- Reviewer.
- Change reason.
- Published time.

## 15.3 Media Pipeline

Khi tải ảnh:

```text
Upload
→ Virus Scan
→ Metadata Strip
→ Resize
→ WebP/AVIF
→ Thumbnail
→ Store
→ CDN
```

## 15.4 SEO

- SSR/SSG.
- Sitemap.
- Canonical.
- Structured data.
- Breadcrumb.
- Open Graph.
- Redirect management.
- Internal linking.

---

# 16. Kiến trúc tìm kiếm

## 16.1 Giai đoạn đầu

Dùng PostgreSQL Full Text Search cho:

- Blog.
- Cẩm nang.
- Địa điểm.
- Sản phẩm.

## 16.2 Khi mở rộng

Chuyển hoặc bổ sung:

- Meilisearch.
- OpenSearch.
- Elasticsearch.

## 16.3 Search Index

Search index chứa:

- Text.
- Category.
- Tag.
- Geo coordinate.
- Availability.
- Rating.
- Partner verification.
- Seasonal relevance.

## 16.4 Faceted Search

Hỗ trợ:

- Danh mục.
- Khoảng cách.
- Mùa.
- Trẻ em.
- Chi phí.
- Thời gian.
- Mức độ vận động.
- Rating.
- Availability.

---

# 17. Kiến trúc bản đồ và routing

## 17.1 Map Provider Adapter

Tạo interface chung:

- Geocoding.
- Reverse geocoding.
- Distance matrix.
- Route.
- Directions link.
- Static map.

Có thể thay provider mà không sửa business logic.

## 17.2 Geo Data

PostgreSQL cần hỗ trợ PostGIS.

Dùng cho:

- Tính khoảng cách.
- Tìm địa điểm gần.
- Cluster.
- Bounding box.
- Route candidate.

## 17.3 Routing Cache

Cache kết quả:

- Từ homestay đến địa điểm.
- Giữa các địa điểm phổ biến.
- Theo phương tiện.

Có thời hạn cập nhật.

---

# 18. Kiến trúc CRM và hành vi

## 18.1 Event Tracking

Mọi hành vi theo chuẩn:

```text
event_name
anonymous_id
user_id
customer_id
session_id
timestamp
source
page
properties
utm
```

## 18.2 Identity Stitching

Khi anonymous user tạo booking:

- Liên kết session cũ.
- Không liên kết nếu không đủ căn cứ.
- Ghi consent.

## 18.3 Customer Timeline

Timeline được tạo từ domain events:

- Booking created.
- Payment confirmed.
- Check-in.
- Review submitted.
- Voucher used.
- AI conversation.
- Trip saved.
- Order completed.

## 18.4 Segmentation

Ban đầu:

- Rule-based segmentation.

Sau này:

- Predictive segmentation.
- LTV.
- Churn risk.

---

# 19. Kiến trúc Marketing Automation

## 19.1 Automation Model

```text
Trigger
→ Condition
→ Delay
→ Action
→ Branch
→ Goal
```

## 19.2 Trigger

- Booking created.
- Payment confirmed.
- Check-out completed.
- Birthday approaching.
- Segment entered.
- Cart abandoned.
- Trip created.
- Voucher expiring.
- Order completed.

## 19.3 Action

- Send email.
- Send Zalo.
- Create voucher.
- Add tag.
- Notify staff.
- Create task.
- Recommend content.

## 19.4 Guardrails

- Consent check.
- Frequency cap.
- Quiet hours.
- Deduplication.
- Suppression list.
- Unsubscribe.

---

# 20. Kiến trúc AI tổng thể

## 20.1 Các lớp AI

```text
User Request
→ Intent Detection
→ Context Builder
→ Retrieval
→ Rule Engine
→ Model Orchestrator
→ Validation
→ Response
→ Logging & Evaluation
```

## 20.2 Provider Abstraction

Không gọi trực tiếp model từ business module.

Tạo `AI Gateway` hỗ trợ:

- Provider.
- Model.
- Cost.
- Timeout.
- Retry.
- Fallback.
- Safety.
- Logging.

## 20.3 RAG

Nguồn retrieval:

- Places.
- Guides.
- FAQ.
- Policies.
- Booking data.
- Trip data.
- Marketplace catalog.

Mỗi chunk phải có:

- Source ID.
- Version.
- Updated time.
- Confidence.
- Access level.

## 20.4 Embedding Pipeline

```text
Content Published
→ Extract
→ Chunk
→ Metadata
→ Embed
→ Store Vector
→ Index Version
```

## 20.5 Prompt Versioning

Lưu:

- Prompt ID.
- Version.
- Owner.
- Change note.
- Test result.
- Active date.

## 20.6 AI Evaluation

Bao gồm:

- Human feedback.
- User rating.
- Automated test set.
- Hallucination check.
- Retrieval relevance.
- Itinerary feasibility.
- Cost per request.

---

# 21. Kiến trúc AI Trip Planner

AI Trip Planner không được chỉ dựa vào LLM.

Cần kết hợp:

1. **Rule Engine**
2. **Constraint Solver**
3. **Geo Routing**
4. **Scoring Engine**
5. **LLM Explanation Layer**

## 21.1 Pipeline

```text
Input Normalization
→ Validate Constraints
→ Candidate Retrieval
→ Filter
→ Geo Clustering
→ Time Window Scheduling
→ Feasibility Check
→ Score Alternatives
→ Generate Explanation
→ User Edit
```

## 21.2 Hard Constraints

- Giờ mở cửa.
- Ngày hoạt động.
- Booking time.
- Check-in/check-out.
- Travel time.
- Max duration.
- Accessibility.
- Mandatory place.

## 21.3 Soft Constraints

- Sở thích.
- Điểm chụp ảnh.
- Ngân sách.
- Nhịp độ.
- Ưu tiên ăn uống.
- Mùa.
- Rating.

## 21.4 Scoring

Ví dụ:

```text
Score =
  Relevance
+ Geo Efficiency
+ Time Fit
+ Group Suitability
+ Seasonal Fit
+ Quality Score
- Travel Penalty
- Risk Penalty
```

---

# 22. Kiến trúc AI Concierge

## 22.1 Tool-based AI

AI Concierge có thể gọi tool:

- Search places.
- Get booking.
- Get trip.
- Check availability.
- Search marketplace.
- Create support ticket.
- Contact staff.

Tool không được cho phép:

- Confirm booking.
- Charge payment.
- Refund.
- Change settlement.

## 22.2 Handover

Khi chuyển người thật:

- Tạo ticket.
- Đính kèm conversation summary.
- Không gửi toàn bộ dữ liệu không cần thiết.
- Có SLA.
- Có trạng thái.

## 22.3 Privacy

- Conversation có retention policy.
- Người dùng có thể xóa.
- Marketing không tự động dùng nội dung hội thoại.
- Dữ liệu booking chỉ truy xuất sau xác thực.

---

# 23. Kiến trúc Marketplace

## 23.1 Multi-vendor nhưng không multi-tenant tuyệt đối

Đối tác dùng chung hệ thống, dữ liệu cách ly theo `partner_id`.

Mọi truy vấn partner portal phải có:

- Partner context.
- Server-side authorization.
- Audit.

## 23.2 Catalog

Tách:

- Product definition.
- Variant.
- Price.
- Inventory.
- Availability.
- Fulfillment rule.
- Cancellation policy.

## 23.3 Order Aggregation

Một checkout tạo:

- Parent order.
- Child orders.
- Payment allocation.
- Partner payable.

## 23.4 Fulfillment Type

- Physical delivery.
- Pickup.
- Scheduled service.
- Instant voucher.
- Tour seat.
- Rental resource.

---

# 24. Kiến trúc commission và settlement

## 24.1 Commission Rule Engine

Rule theo:

- Partner.
- Category.
- Product.
- Campaign.
- Date range.
- Volume tier.

## 24.2 Allocation

Mỗi order item tạo allocation:

- Gross amount.
- Discount.
- Platform-funded discount.
- Partner-funded discount.
- Tax.
- Payment fee.
- Platform commission.
- Partner payable.

## 24.3 Settlement

```text
Eligible Order
→ Settlement Batch
→ Calculate
→ Review
→ Partner Confirm
→ Accounting Approve
→ Pay
→ Close
```

## 24.4 Immutable Snapshot

Khi settlement được chốt:

- Snapshot giá.
- Snapshot commission.
- Snapshot fee.
- Không tính lại tự động theo rule mới.

---

# 25. Event Catalog cốt lõi

## Booking

- `booking.created`
- `booking.hold_expired`
- `booking.payment_confirmed`
- `booking.confirmed`
- `booking.cancelled`
- `booking.checked_in`
- `booking.checked_out`

## Payment

- `payment.intent_created`
- `payment.transaction_received`
- `payment.confirmed`
- `payment.failed`
- `payment.refund_requested`
- `payment.refunded`

## CRM

- `customer.created`
- `customer.updated`
- `customer.merged`
- `customer.segment_entered`

## Content

- `content.published`
- `place.updated`
- `place.data_stale`

## Trip

- `trip.created`
- `itinerary.generated`
- `itinerary.saved`
- `itinerary.shared`
- `trip.activity_completed`

## AI

- `ai.response_generated`
- `ai.response_rated`
- `ai.handover_created`

## Marketplace

- `partner.approved`
- `product.published`
- `order.created`
- `order.partner_confirmed`
- `order.completed`
- `settlement.created`
- `settlement.paid`

---

# 26. API conventions

## 26.1 Base URL

```text
/api/v1
```

## 26.2 Resource naming

Dùng danh từ số nhiều:

- `/bookings`
- `/payments`
- `/places`
- `/trips`
- `/partners`
- `/orders`

## 26.3 Error format

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Phòng không còn trống trong thời gian đã chọn.",
    "details": {},
    "correlation_id": "..."
  }
}
```

## 26.4 Pagination

Cursor-based cho dữ liệu lớn.

## 26.5 Idempotency

Bắt buộc với:

- Booking.
- Payment.
- Refund.
- Order.
- Settlement adjustment.

## 26.6 Versioning

- Version qua URL.
- Breaking change tạo version mới.
- Không thay đổi âm thầm response contract.

---

# 27. Authentication và Authorization

## 27.1 Authentication

Hỗ trợ:

- Email/password.
- Phone OTP.
- OAuth.
- Magic link.
- Partner MFA.

## 27.2 Authorization

Kết hợp:

- RBAC.
- Resource ownership.
- Partner scope.
- Attribute-based rule khi cần.

## 27.3 Vai trò

- Super Admin.
- Admin.
- Manager.
- Reception.
- Marketing.
- CRM Manager.
- Accountant.
- AI Admin.
- Moderator.
- Marketplace Manager.
- Support Agent.
- Partner Admin.
- Partner Staff.
- Member.

## 27.4 Nguyên tắc

- Deny by default.
- Kiểm tra quyền ở backend.
- Không tin role từ frontend.
- Có audit cho thao tác nhạy cảm.
- Tài khoản ngân hàng thay đổi cần xác minh lại.

---

# 28. Bảo mật

## 28.1 Web Security

- HTTPS.
- HSTS.
- CSP.
- CSRF protection.
- XSS prevention.
- SQL injection prevention.
- Secure cookies.
- Rate limiting.
- Bot protection.

## 28.2 API Security

- JWT validation.
- Token expiry.
- Refresh token rotation.
- Scope validation.
- Request size limit.
- IP throttling cho endpoint nhạy cảm.
- Webhook signature verification.

## 28.3 Secret Management

- Không lưu secret trong source code.
- Dùng secret manager.
- Rotate key.
- Tách key theo môi trường.
- Log không chứa secret.

## 28.4 File Security

- Virus scan.
- MIME validation.
- File size limit.
- Signed URL.
- Không cho thực thi file upload.

## 28.5 Financial Security

- MFA.
- Dual approval cho thay đổi quan trọng.
- Immutable ledger.
- Audit log.
- Reconciliation alert.

---

# 29. Quyền riêng tư và quản trị dữ liệu

## 29.1 Data Classification

- Public.
- Internal.
- Confidential.
- Sensitive.
- Financial.

## 29.2 Sensitive Data

Bao gồm:

- Số điện thoại.
- Email.
- Thông tin định danh.
- Tài khoản ngân hàng.
- Dữ liệu booking.
- Nội dung hội thoại AI riêng tư.
- Vị trí hiện tại.

## 29.3 Retention

Cần chính sách riêng cho:

- Booking.
- Payment.
- CRM.
- AI conversation.
- Audit.
- Media.
- Partner documents.

## 29.4 Data Subject Controls

Hỗ trợ:

- Tải dữ liệu.
- Chỉnh sửa.
- Yêu cầu xóa.
- Tắt marketing.
- Tắt cá nhân hóa.
- Xóa hội thoại AI.
- Thu hồi link chia sẻ.

---

# 30. Audit Logging

Mọi module quan trọng dùng audit service chung.

Audit record:

- Actor.
- Role.
- Action.
- Resource.
- Resource ID.
- Before.
- After.
- Reason.
- IP.
- User agent.
- Timestamp.
- Correlation ID.

Audit log không được sửa bởi người dùng thông thường.

---

# 31. Observability

## 31.1 Logs

- Structured JSON logs.
- Correlation ID.
- User ID khi phù hợp.
- Không log dữ liệu nhạy cảm.

## 31.2 Metrics

- API latency.
- Error rate.
- Queue backlog.
- Payment webhook success.
- Booking conflict.
- Notification delivery.
- AI latency.
- AI cost.
- Search latency.
- Settlement mismatch.

## 31.3 Tracing

Dùng distributed tracing cho:

- Booking → payment → notification.
- Order → allocation → settlement.
- AI request → retrieval → model.

## 31.4 Alerting

Cảnh báo:

- Payment webhook lỗi.
- Queue backlog.
- Database connection.
- Booking hold không release.
- Notification failure.
- AI cost tăng bất thường.
- Settlement mismatch.
- Disk/storage threshold.

---

# 32. Availability và Disaster Recovery

## 32.1 Backup

- Daily full backup.
- Point-in-time recovery.
- Object storage versioning.
- Backup configuration.
- Restore test định kỳ.

## 32.2 RPO và RTO mục tiêu

Giai đoạn đầu:

- RPO: tối đa 15 phút cho database.
- RTO: tối đa 4 giờ.

Giao dịch tài chính cần mục tiêu nghiêm ngặt hơn khi Marketplace vận hành.

## 32.3 Failure Mode

Khi service ngoài lỗi:

- Email lỗi: queue retry.
- Zalo lỗi: fallback email.
- Map lỗi: dùng dữ liệu cache.
- AI lỗi: hiển thị nội dung chuẩn hoặc chuyển nhân viên.
- Payment webhook chậm: cho phép tra cứu và đối soát thủ công.
- Search lỗi: fallback database search.

---

# 33. Hiệu năng và SLO

## 33.1 Web

- LCP mục tiêu dưới 2,5 giây ở trang chính.
- API đọc phổ biến p95 dưới 500 ms.
- API ghi nghiệp vụ p95 dưới 1 giây, không tính provider ngoài.
- Search p95 dưới 800 ms.

## 33.2 AI

- Concierge phản hồi đầu tiên trong khoảng thời gian chấp nhận được.
- Trip Planner có trạng thái tiến trình.
- Timeout và fallback rõ ràng.
- Không giữ kết nối vô thời hạn.

## 33.3 Payment

- Webhook xử lý idempotent.
- Xử lý nội bộ dưới 5 giây trong điều kiện bình thường.
- Có cơ chế retry và manual reconcile.

---

# 34. Caching Strategy

Cache cho:

- Homepage.
- Content.
- Place detail.
- Search suggestion.
- Map cluster.
- Distance matrix.
- AI FAQ.
- Product catalog.

Không cache mù cho:

- Availability.
- Payment status.
- Order financial data.
- Settlement.
- Permission.

Cache phải có invalidation event.

---

# 35. Analytics Architecture

## 35.1 Giai đoạn đầu

- Event table trong PostgreSQL.
- Đồng bộ định kỳ sang BI.

## 35.2 Giai đoạn mở rộng

Tách:

- Event collector.
- Data warehouse.
- BI layer.
- Scheduled aggregation.

## 35.3 Data Model

- Fact booking.
- Fact payment.
- Fact order.
- Fact interaction.
- Fact campaign.
- Dimension customer.
- Dimension place.
- Dimension partner.
- Dimension product.
- Dimension channel.

---

# 36. CI/CD

## 36.1 Branch Strategy

- `main`: production.
- `develop`: staging nếu cần.
- Feature branch.
- Pull request bắt buộc.

## 36.2 Pipeline

```text
Lint
→ Type Check
→ Unit Test
→ Integration Test
→ Build
→ Security Scan
→ Deploy Preview
→ Approval
→ Production Deploy
```

## 36.3 Migration

- Database migration có version.
- Không sửa trực tiếp production schema.
- Migration phải có rollback hoặc forward-fix plan.
- Backup trước migration lớn.

---

# 37. Môi trường

- Local.
- Development.
- Staging.
- Production.

Tách riêng:

- Database.
- Auth key.
- Payment key.
- Zalo.
- Email.
- AI key.
- Storage.

Không dùng dữ liệu khách thật trong development.

---

# 38. Testing Strategy

## 38.1 Unit Test

Cho:

- Pricing.
- Availability.
- Voucher.
- Commission.
- Settlement.
- Trip scoring.
- Permission.

## 38.2 Integration Test

Cho:

- Booking transaction.
- Payment webhook.
- Notification.
- CRM synchronization.
- Search index.
- AI retrieval.
- Order split.

## 38.3 End-to-End Test

Các luồng bắt buộc:

- Đặt phòng.
- Đặt BBQ.
- Thanh toán.
- Nhắc lịch.
- Tạo lịch trình.
- AI Concierge.
- Đặt tour.
- Đối tác xác nhận.
- Đối soát.
- Hoàn tiền.

## 38.4 Contract Test

Áp dụng cho provider adapter:

- SePay.
- Email.
- Zalo.
- Map.
- AI.
- Payment gateway.

## 38.5 AI Evaluation Test

- Golden dataset.
- Regression test.
- Feasibility test.
- Hallucination test.
- Safety test.

---

# 39. Feature Flag

Dùng feature flag để:

- Mở tính năng theo Phase.
- Chạy thử nhóm nội bộ.
- Mở cho một phần khách.
- Thử provider AI.
- Thử flow thanh toán.
- Tắt nhanh tính năng lỗi.

Feature flag không thay thế phân quyền.

---

# 40. Lộ trình triển khai kỹ thuật theo Phase

## Phase 1

Xây nền:

- Identity nội bộ.
- Booking.
- BBQ.
- Payment.
- Notification.
- CMS.
- Audit.
- Reporting cơ bản.

## Phase 2

Mở rộng:

- Place.
- Map.
- Search.
- CRM.
- Marketing.
- Voucher.
- Review nội bộ.
- Behavioral events.
- AI knowledge pipeline.

## Phase 3

Mở rộng:

- Member identity.
- Trip.
- Group.
- AI Gateway.
- RAG.
- Planner rule engine.
- Concierge.
- Review công khai.
- Album.
- Personalization.

## Phase 4

Mở rộng:

- Partner.
- Catalog.
- Multi-vendor cart.
- Order.
- Ledger.
- Commission.
- Settlement.
- Dispute.
- Advanced membership.
- Referral.
- Marketplace AI tools.

---

# 41. Những thành phần phải xây từ Phase 1 để tránh làm lại

1. UUID cho mọi thực thể.
2. Audit log.
3. Domain event.
4. Provider adapter.
5. Notification queue.
6. Payment intent.
7. Idempotency.
8. Customer profile tách khỏi booking.
9. Resource availability abstraction.
10. Structured CMS.
11. API versioning.
12. Role-based authorization.
13. Object storage abstraction.
14. UTM tracking.
15. Correlation ID.
16. Database migration.
17. Monorepo.
18. Test foundation.
19. Feature flag.
20. Consent model.

---

# 42. Thành phần chưa cần xây hoàn chỉnh ở Phase 1

Chỉ cần interface hoặc schema dự phòng:

- Partner.
- Marketplace order.
- Commission.
- Settlement.
- AI conversation.
- Trip itinerary.
- Membership tier.
- Referral.

Không tạo toàn bộ bảng và logic chỉ để “dự phòng”. Chỉ cần bảo đảm ranh giới kiến trúc không cản trở việc bổ sung sau này.

---

# 43. Chiến lược chống Vendor Lock-in

Mọi tích hợp qua adapter:

```text
PaymentProvider
EmailProvider
MessagingProvider
MapProvider
AIProvider
StorageProvider
SearchProvider
```

Business logic chỉ gọi interface.

Không dùng format riêng của provider làm model nghiệp vụ chính.

---

# 44. Quản lý chi phí

## 44.1 AI

Theo dõi:

- Token.
- Model.
- Request type.
- Customer.
- Feature.
- Cost.
- Cache hit.

## 44.2 Map

Theo dõi:

- Geocoding.
- Route.
- Distance matrix.
- Map load.

## 44.3 Notification

Theo dõi:

- Email sent.
- Zalo sent.
- SMS sent.
- Failure.
- Cost.

## 44.4 Storage

Theo dõi:

- Upload.
- Bandwidth.
- Image processing.
- Archive.

---

# 45. Architectural Decision Records

Cần tạo ADR cho các quyết định lớn:

- ADR-001: Modular Monolith.
- ADR-002: PostgreSQL là database chính.
- ADR-003: Next.js cho frontend.
- ADR-004: NestJS cho backend.
- ADR-005: Redis và BullMQ.
- ADR-006: Provider Adapter.
- ADR-007: Event-driven background jobs.
- ADR-008: AI không tự thực hiện giao dịch.
- ADR-009: Trip Planner kết hợp rule engine và LLM.
- ADR-010: Ledger bất biến cho Marketplace.
- ADR-011: Multi-destination readiness.
- ADR-012: Customer identity resolution.

---

# 46. Các Tech Spec cần viết sau Master Architecture

## 46.1 Phase 1

- Application architecture.
- Database schema.
- Booking engine.
- BBQ reservation.
- Payment SePay.
- Notification.
- Admin.
- CMS.
- API.
- Security.
- Testing.
- Deployment.

## 46.2 Phase 2

- Place data model.
- Map integration.
- Search.
- CRM.
- Marketing automation.
- Voucher.
- Review.
- Event tracking.
- AI data pipeline.

## 46.3 Phase 3

- Membership.
- Group trip.
- Trip Planner.
- Rule engine.
- RAG.
- AI Concierge.
- AI observability.
- Public review.
- Album.
- Personalization.

## 46.4 Phase 4

- Partner portal.
- Catalog.
- Availability.
- Multi-vendor cart.
- Order split.
- Ledger.
- Commission.
- Settlement.
- Dispute.
- Referral.
- Marketplace AI.

---

# 47. Các quyết định cần chốt trước Tech Spec Phase 1

1. Domain chính thức.
2. Logo, màu và font.
3. Danh sách phòng.
4. Quy tắc giá.
5. Chính sách cọc.
6. Chính sách hủy.
7. Tài khoản SePay.
8. Kênh Zalo.
9. Nhà cung cấp email.
10. Nền tảng cloud.
11. Đơn vị quản trị hệ thống.
12. Quy trình check-in/check-out.
13. Vai trò người dùng nội bộ.
14. Dữ liệu phải lưu theo yêu cầu pháp lý.
15. Ngân sách vận hành hạ tầng.

---

# 48. Tiêu chí chấp nhận Master Architecture

Master Architecture được xem là đủ điều kiện để chuyển sang Tech Spec khi:

1. Các domain đã có ranh giới rõ.
2. Luồng booking và thanh toán đã có nguyên tắc.
3. Kiến trúc CRM không phụ thuộc booking.
4. Dữ liệu địa điểm có cấu trúc riêng.
5. AI có gateway, RAG và rule engine.
6. Marketplace có order split và ledger.
7. Đã có chiến lược authorization.
8. Đã có chiến lược audit.
9. Đã có chiến lược backup.
10. Đã có chiến lược provider adapter.
11. Đã có lộ trình theo Phase.
12. Đã xác định các ADR cần tạo.
13. Đã xác định các Tech Spec cần viết.
14. Không có module nào buộc phải xây lại hoàn toàn khi chuyển Phase.

---

# 49. Kết luận

Kiến trúc đề xuất giúp Vườn Măng Đen triển khai theo nguyên tắc:

> **Ra mắt nhanh ở Phase 1 nhưng vẫn giữ khả năng mở rộng đến AI và Marketplace ở Phase 4.**

Điểm quan trọng nhất không phải sử dụng nhiều công nghệ, mà là:

- Chia đúng domain.
- Giữ dữ liệu nhất quán.
- Xây API và event chuẩn.
- Quản lý giao dịch bằng idempotency.
- Không phụ thuộc provider.
- Không dùng AI thay cho rule và dữ liệu.
- Không dùng microservices quá sớm.
- Bảo đảm mọi giao dịch tài chính có thể truy vết.

Sau tài liệu này, bước tiếp theo là viết:

> `VMD_TECHSPEC_PHASE_01_MVP_BOOKING.md`

Tech Spec Phase 1 sẽ chuyển các nguyên tắc của Master Architecture thành thiết kế triển khai cụ thể gồm database schema, API endpoint, state machine, webhook, queue, scheduler, phân quyền, kiểm thử và cấu hình triển khai.
