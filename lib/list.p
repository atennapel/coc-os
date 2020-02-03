def List = \(t : *). {r : *} -> r -> (t -> r -> r) -> r

def Nil : {t : *} -> List t = \{t} {r} hd tl. hd
def Cons
  : {t : *} -> t -> List t -> List t
  = \{t} hdx tlx {r} hd tl. tl hdx (tlx {r} hd tl)

def foldList
  : {t : *} -> {r : *} -> List t -> r -> (t -> r -> r) -> r
  = \{t} {r} list. list {r}

def map
  : {a : *} -> {b : *} -> (a -> b) -> List a -> List b
  = \{a} {b} fn list. foldList {a} {List b} list (Nil {b}) (\hd tl. Cons {b} (fn hd) tl)
