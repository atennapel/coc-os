def List = \(t : *). {r : *} -> r -> (t -> r -> r) -> r

def Nil : {t : *} -> List t = \{t : *} {r : *} (hd : r) (tl : t -> r -> r). hd
def Cons
  : {t : *} -> t -> List t -> List t
  = \{t : *} (hdx : t) (tlx : List t) {r : *} (hd : r) (tl : t -> r -> r). tl hdx (tlx {r} hd tl)

def foldList
  : {t : *} -> {r : *} -> List t -> r -> (t -> r -> r) -> r
  = \{t : *} {r : *} (list : List t). list {r}

def map
  : {a : *} -> {b : *} -> (a -> b) -> List a -> List b
  = \{a : *} {b : *} (fn : a -> b) (list : List a). foldList {a} {List b} list (Nil {b}) (\(hd : a) (tl : List b). Cons {b} (fn hd) tl)
