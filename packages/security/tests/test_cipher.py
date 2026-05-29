"""Contract tests for TokenCipher implementations (run against the FakeCipher).

The real Cloud KMS adapter (KmsTokenCipher) implements the same protocol and is
exercised in integration, not here (needs GCP credentials).
"""

import pytest

from cueprofit_security import EncryptedToken, FakeCipher


def test_round_trip_returns_original_plaintext():
    c = FakeCipher()
    tok = c.encrypt("1//refresh-token-abc")
    assert isinstance(tok, EncryptedToken)
    assert isinstance(tok.ciphertext, bytes)
    assert tok.key_version
    assert c.decrypt(tok) == "1//refresh-token-abc"


def test_ciphertext_does_not_contain_plaintext():
    c = FakeCipher()
    tok = c.encrypt("supersecret")
    assert b"supersecret" not in tok.ciphertext


def test_decrypt_rejects_tampered_ciphertext():
    c = FakeCipher()
    with pytest.raises(ValueError):
        c.decrypt(EncryptedToken(ciphertext=b"garbage-not-valid", key_version="fake-key/1"))


def test_encrypt_rejects_empty_plaintext():
    c = FakeCipher()
    with pytest.raises(ValueError):
        c.encrypt("")


def test_unicode_round_trip():
    c = FakeCipher()
    s = "tökén-✓-Ünïcøde"
    assert c.decrypt(c.encrypt(s)) == s
