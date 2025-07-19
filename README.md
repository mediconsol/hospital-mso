# Hospital MSO Management System

병원/MSO 통합 관리 시스템입니다. 직원 관리, 업무 관리, 파일 관리, 일정 관리, 메시징 등의 기능을 제공합니다.

## 🚀 주요 기능

- **조직 관리**: 병원/MSO 등록 및 관리
- **직원 관리**: 직원 등록, 부서 관리, 권한 설정
- **업무 관리**: 태스크 생성, 배정, 진행 상황 추적
- **파일 관리**: 문서 업로드, 공유, 권한 관리
- **일정 관리**: 스케줄 등록, 캘린더 뷰
- **실시간 메신저**: 팀 채팅, 개인 메시지
- **알림 센터**: 공지사항, 실시간 알림
- **보고서**: 각종 통계 및 리포트

## 🛠 기술 스택

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **UI Components**: Radix UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Deployment**: Vercel

## 📦 설치 및 실행

### 1. 클론 및 의존성 설치

```bash
git clone git@github.com:mediconsol/hospital-mso.git
cd hospital-mso
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env.local` 파일을 생성하고 Supabase 정보를 입력합니다.

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_AUTH_EXTERNAL_REDIRECT_URL=http://localhost:3000/auth/callback
```

### 3. 데이터베이스 설정

Supabase 대시보드의 SQL Editor에서 `supabase/production-migration.sql` 파일을 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000에서 확인할 수 있습니다.

## 🚀 배포

### Vercel 배포

1. Vercel에 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포

자세한 배포 가이드는 `vercel-deploy-guide.md`를 참조하세요.

## 📁 프로젝트 구조

```
├── app/                    # Next.js App Router
├── components/             # React 컴포넌트
│   ├── auth/              # 인증 관련
│   ├── dashboard/         # 대시보드
│   ├── layout/            # 레이아웃
│   └── ui/                # UI 컴포넌트
├── lib/                   # 유틸리티 함수
├── supabase/              # 데이터베이스 마이그레이션
└── public/                # 정적 파일
```

## 🔐 인증

Supabase Auth를 사용한 이메일/비밀번호 인증을 지원합니다.

## 📊 데이터베이스

PostgreSQL 기반의 Supabase를 사용하며, Row Level Security(RLS)로 데이터 보안을 관리합니다.

## 🤝 기여

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 🆘 지원

문제가 발생하면 GitHub Issues를 통해 문의해주세요.