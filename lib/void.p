def {Void} = #0

def indVoid
  : {P : Void -> *} ->
    (x : Void) ->
    P x
  = \{P} x. ?0 {P} x
