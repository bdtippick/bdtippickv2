# BaedaltipPick v2

배달팁픽 v2는 배달 기사 정산 관리 시스템입니다.

## 🚀 주요 기능

- **엑셀 파일 파싱**: 정산 엑셀 파일을 자동 파싱하여 데이터베이스에 저장
- **종합 정산 관리**: 기사별 종합 정산 내역 관리
- **지원금 관리**: 일반 지원금 및 추가 지원금 내역 관리
- **차감 내역 관리**: 각종 차감 항목 관리
- **보험료 관리**: 시간제 보험료 차감 및 소급 보험료 내역 관리

## 🛠 기술 스택

### Frontend
- **Next.js 15.3.3** + **React 19**
- **TypeScript**
- **Tailwind CSS**

### Backend
- **Supabase** (Database & Edge Functions)
- **PostgreSQL** (Database)

### 파일 처리
- **xlsx** (Excel 파일 파싱)

## 📁 프로젝트 구조

```
bdtippickv2/
├── baedaltip-pick-frontend/     # Next.js 프론트엔드
├── supabase/                    # Supabase 설정 및 함수
│   ├── functions/
│   │   └── excel-parser/        # 엑셀 파싱 Edge Function
│   └── migrations/              # 데이터베이스 마이그레이션
├── package.json
└── README.md
```

## 🔧 설정 방법

### 1. 프로젝트 클론

```bash
git clone [리포지토리 URL]
cd bdtippickv2
```

### 2. 의존성 설치

```bash
# 프론트엔드 설치
cd baedaltip-pick-frontend
npm install

# 루트 디렉토리로 돌아가기
cd ..
```

### 3. Supabase 설정

```bash
# Supabase CLI 설치 (필요한 경우)
npm install -g supabase

# Supabase 프로젝트 연결
supabase link --project-ref [프로젝트 ID]

# 데이터베이스 마이그레이션 실행
supabase db push
```

### 4. 환경 변수 설정

프론트엔드 디렉토리에 `.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. 개발 서버 실행

```bash
# 프론트엔드 서버 실행
cd baedaltip-pick-frontend
npm run dev
```

## 📊 데이터베이스 구조

### 주요 테이블

- `total_summary`: 종합 정산 내역
- `support_funds`: 지원금 내역
- `additional_support_funds`: 추가 지원금 내역
- `deductions`: 차감 내역
- `hourly_insurance_deductions`: 시간제 보험료 차감
- `retroactive_insurance_details`: 소급 보험료 내역

## 🔍 엑셀 파일 파싱 규칙

시스템은 다음 형식의 엑셀 파일을 파싱합니다:

1. **종합** 시트: 기사별 종합 정산 내역
2. **지원금** 시트: 일반 지원금 내역
3. **추가지원금** 시트: 추가 지원금 내역
4. **차감내역** 시트: 각종 차감 항목
5. **시간제보험(차감)** 시트: 시간제 보험료 차감
6. **보험료(소급)** 시트: 소급 보험료 내역

### 기사 ID 인식 규칙

- 패턴 1: `[이름]+[휴대폰번호뒤4자리]` (예: "홍길동1234")
- 패턴 2: `[이름] [휴대폰번호뒤4자리]` (구분자 포함, 예: "홍길동 1234")
- 패턴 3: `[이름]` (이름만, 예: "홍길동")

## 🚀 배포

Supabase Edge Functions는 자동으로 배포됩니다:

```bash
supabase functions deploy excel-parser
```

프론트엔드는 Vercel, Netlify 등에 배포 가능합니다.

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 🤝 기여

프로젝트에 기여하고 싶으시다면 Pull Request를 보내주세요!

## 📞 문의

문의사항이 있으시면 이슈를 등록해주세요. 