def {Sigma} = \(A : *) (B : A -> *). (x : A) ** B x

def indSigma
  : {A : *} -> {B : A -> *} -> {P : Sigma A B -> *} -> ((x : A) -> (y : B x) -> P (x, y)) -> (x : Sigma A B) -> P x
  = \{A} {B} {P} case x. case (fst x) (snd x)
