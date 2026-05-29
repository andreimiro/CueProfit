"""CueProfit security primitives."""

from cueprofit_security.cipher import EncryptedToken, FakeCipher, TokenCipher

__all__ = ["EncryptedToken", "FakeCipher", "TokenCipher", "get_kms_cipher"]


def get_kms_cipher(key_name: str):
    """Construct the Cloud KMS cipher (requires the `kms` extra). Lazy to keep
    google-cloud-kms out of the default import path."""
    from cueprofit_security.kms import KmsTokenCipher

    return KmsTokenCipher(key_name)
