"""
Root conftest.py for test isolation.

This file ensures all tests run against the dedicated `aiops_test`
PostgreSQL database, never against the production `aiops` database.

Strategy:
- Override DATABASE_URL env var before any app imports
- Run Alembic migrations on test DB at session start
- Drop all tables after the test session
"""
from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator, Generator

import pytest
import pytest_asyncio

# ── 1. Override env BEFORE any app imports ─────────────────────────────────
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://aiops:aiops@localhost:5433/aiops_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-testing-purposes")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("LOG_LEVEL", "WARNING")
os.environ.setdefault("LOG_JSON", "false")

# ── 2. Now import app modules (after env override) ─────────────────────────
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base  # noqa: E402  (all models registered here)
import app.models  # noqa: F401 – ensure all models are imported

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

# ── 3. Test engine (separate from app engine) ──────────────────────────────
from sqlalchemy.pool import NullPool
_test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
_TestSessionLocal = async_sessionmaker(
    bind=_test_engine,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


# ── 4. Session-scoped setup/teardown ──────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database() -> AsyncIterator[None]:
    """Create all tables in the test DB before tests; drop after."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _test_engine.dispose()


# ── 5. Per-test cleanup (truncate user-related tables) ────────────────────
@pytest.fixture(autouse=True)
async def truncate_users() -> AsyncIterator[None]:
    """Truncate user tables between tests for isolation."""
    from sqlalchemy import text
    async with _TestSessionLocal() as session:
        await session.execute(text("TRUNCATE TABLE user_roles, refresh_tokens, users RESTART IDENTITY CASCADE"))
        await session.commit()
    yield


# ── 6. Override app's get_db_session with test session ────────────────────
@pytest.fixture(autouse=True)
def override_db_session(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch app.db.session so the app uses the test DB session."""
    async def _get_test_session() -> AsyncIterator[AsyncSession]:
        async with _TestSessionLocal() as session:
            yield session

    import app.db.session as db_session_module
    monkeypatch.setattr(db_session_module, "engine", _test_engine)
    monkeypatch.setattr(db_session_module, "AsyncSessionLocal", _TestSessionLocal)
    monkeypatch.setattr(db_session_module, "get_db_session", _get_test_session)


# ── 7. Patch get_settings lru_cache so tests use test env ─────────────────
@pytest.fixture(scope="session", autouse=True)
def clear_settings_cache() -> Generator[None, None, None]:
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
