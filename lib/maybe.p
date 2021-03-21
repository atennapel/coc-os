import lib/unit.p
import lib/either.p

def {Maybe} = \(t : *). Either () t
def Nothing : {t : *} -> Maybe t = \{t}. Left {()} {t} Unit
def Just : {t : *} -> t -> Maybe t = \{t} x. Right {()} {t} x

def indMaybe
  : {t : *} -> {P : Maybe t -> *} -> P Nothing -> ((x : t) -> P (Just x)) -> (x : Maybe t) -> P x
  = \{t} {P} nothing just x. indEither {()} {t} {P} (\_. nothing) just x

def caseMaybe
  : {t r : *} -> Maybe t -> r -> (t -> r) -> r
  = \{t} {r} x nothing just. caseEither {()} {t} {r} x (\_. nothing) just
