def List = \(t : *). {r : *} -> r -> (t -> r -> r) -> r

def Nil : {t : *} -> List t = \hd tl. hd
def Cons
  : {t : *} -> t -> List t -> List t
  = \hdx tlx hd tl. tl hdx (tlx hd tl)

def foldList
  : {t : *} -> {r : *} -> List t -> r -> (t -> r -> r) -> r
  = \list. list

def map
  : {a : *} -> {b : *} -> (a -> b) -> List a -> List b
  = \{a} {b} fn list. foldList {a} {List b} list (Nil {b}) (\hd tl. Cons {b} (fn hd) tl)
