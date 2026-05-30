import pytest

from cueprofit_workers.tokens import build_refresh_body, parse_refresh_response


def test_build_refresh_body():
    assert build_refresh_body(refresh_token="rt", client_id="cid", client_secret="sec") == {
        "grant_type": "refresh_token",
        "refresh_token": "rt",
        "client_id": "cid",
        "client_secret": "sec",
    }


def test_parse_refresh_ok():
    tok = parse_refresh_response({"access_token": "at", "expires_in": 3599}, now=1000)
    assert tok.access_token == "at"
    assert tok.expires_at == 1000 + 3599


def test_parse_refresh_error_raises():
    with pytest.raises(ValueError):
        parse_refresh_response({"error": "invalid_grant", "error_description": "bad"}, now=1000)


def test_parse_refresh_missing_access_token_raises():
    with pytest.raises(ValueError):
        parse_refresh_response({"expires_in": 10}, now=1000)
