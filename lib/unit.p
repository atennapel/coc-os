def {UnitType} = #1
def Unit : UnitType = @0

def indUnit
  : {P : UnitType -> *} ->
    P Unit ->
    (x : UnitType) ->
    P x
  = \{P} u x. ?1 {P} x u
